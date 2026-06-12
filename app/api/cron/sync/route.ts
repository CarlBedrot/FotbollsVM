export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { loadFixtures } from "@/lib/fixtures/load";
import {
  getMatchRepository,
  getStandingsRepository,
  getPredictionRepository,
  getUserRepository,
} from "@/lib/db/repository";
import { fetchWorldCupMatches } from "@/lib/results/footballDataClient";
import {
  proposalsFromApi,
  pairingsFromApi,
  filterNewResults,
  liveFromApi,
  type MatchLabels,
} from "@/lib/results/footballData";
import { recomputeStandings } from "@/lib/results/recompute";

/** Unattended sync: resolve knockout pairings, apply new finished results,
 *  recompute standings when something changed, and mirror in-play scores.
 *  Authorized via a bearer token — CRON_SECRET (scheduled GitHub Action) or
 *  CRON_SECRET_ALT (external cron service), never a user session. Two secrets
 *  so either caller can be rotated without touching the other.
 *
 *  Responds 500 when the api reports a finished match we cannot map — both
 *  cron callers alert on non-200, which is the alarm for name mismatches. */
async function sync(req: Request) {
  const auth = req.headers.get("authorization");
  const secrets = [process.env.CRON_SECRET, process.env.CRON_SECRET_ALT].filter(
    Boolean,
  );
  if (secrets.length === 0 || !secrets.some((s) => auth === `Bearer ${s}`)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const fixtures = loadFixtures();
  const teamName = new Map(fixtures.teams.map((t) => [t.id, t.name]));
  const labels: MatchLabels = {};
  for (const m of fixtures.matches)
    labels[m.id] = { home: m.homeLabel, away: m.awayLabel, kickoff: m.kickoff };

  let apiMatches;
  try {
    apiMatches = await fetchWorldCupMatches();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  const matchRepo = getMatchRepository();
  let ourMatches = await matchRepo.all();

  // Knockout slots already resolved in the db match the api by team name,
  // not by their fixture placeholder ("2A", "W73") — swap in real names.
  const applyResolvedLabels = () => {
    for (const m of ourMatches) {
      if (m.stage === "group" || !m.homeTeamId || !m.awayTeamId) continue;
      const lab = labels[m.id];
      if (!lab) continue;
      lab.home = teamName.get(m.homeTeamId) ?? lab.home;
      lab.away = teamName.get(m.awayTeamId) ?? lab.away;
    }
  };
  applyResolvedLabels();

  // Phase 1: pair newly seeded knockout slots with real teams.
  const pairings = pairingsFromApi(
    apiMatches,
    ourMatches,
    labels,
    fixtures.teams,
  );
  for (const p of pairings) {
    await matchRepo.setTeams(p.matchId, {
      homeTeamId: p.homeTeamId,
      awayTeamId: p.awayTeamId,
    });
  }
  if (pairings.length > 0) {
    ourMatches = await matchRepo.all();
    applyResolvedLabels();
  }

  // Phase 2: apply finished results that are new or corrected.
  const allProposals = proposalsFromApi(apiMatches, ourMatches, labels);
  const matchedProposals = allProposals.filter(
    (p) => p.matchedBy !== "unmatched",
  );
  const fresh = filterNewResults(matchedProposals, ourMatches);

  const unmatched = allProposals
    .filter((p) => p.matchedBy === "unmatched")
    .map((p) => `${p.homeLabel} ${p.homeScore}-${p.awayScore} ${p.awayLabel}`);
  const today = new Date().toISOString().slice(0, 10);
  const todayStatuses = apiMatches
    .filter((m) => m.utcDate.slice(0, 10) === today)
    .map((m) => `${m.homeTeam.name}-${m.awayTeam.name}: ${m.status}`);

  if (fresh.length > 0) {
    const admin = (await getUserRepository().list()).find((u) => u.isAdmin);
    if (!admin)
      return NextResponse.json({ error: "no admin user" }, { status: 500 });

    for (const p of fresh) {
      await matchRepo.setResult(p.matchId, {
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        source: "api",
        updatedBy: admin.id,
      });
    }
    await recomputeStandings({
      teams: fixtures.teams,
      matchRepo,
      standingsRepo: getStandingsRepository(),
      predRepo: getPredictionRepository(),
    });
  }

  // Phase 3: mirror current scores of in-play matches. Live scores never
  // affect scoring or standings — matchOutcome requires status 'finished'.
  const liveUpdates = liveFromApi(apiMatches, ourMatches, labels);
  for (const l of liveUpdates) {
    await matchRepo.setLiveScore(l.matchId, {
      homeScore: l.homeScore,
      awayScore: l.awayScore,
    });
  }

  return NextResponse.json(
    {
      ok: unmatched.length === 0,
      applied: fresh.length,
      results: fresh.map(
        (p) => `${p.homeLabel} ${p.homeScore}-${p.awayScore} ${p.awayLabel}`,
      ),
      paired: pairings.map((p) => `${p.matchId}: ${p.homeName}-${p.awayName}`),
      live: liveUpdates.map(
        (l) => `${l.matchId}: ${l.homeScore}-${l.awayScore}`,
      ),
      unmatched,
      todayStatuses,
    },
    { status: unmatched.length === 0 ? 200 : 500 },
  );
}

export async function POST(req: Request) {
  return sync(req);
}

export async function GET(req: Request) {
  return sync(req);
}

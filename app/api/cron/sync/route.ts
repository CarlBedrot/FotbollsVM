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
import { proposalsFromApi, type MatchLabels } from "@/lib/results/footballData";
import { recomputeStandings } from "@/lib/results/recompute";

/** Unattended results sync: fetch finished matches from football-data, apply
 *  anything new and recompute standings. Authorized via CRON_SECRET bearer
 *  token (called from a scheduled GitHub Action), not a user session. */
async function sync(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const fixtures = loadFixtures();
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
  const ourMatches = await matchRepo.all();
  const allProposals = proposalsFromApi(apiMatches, ourMatches, labels);
  const proposals = allProposals.filter((p) => p.matchedBy !== "unmatched");
  // Surface what the API reported but we could not map, plus today's raw
  // statuses — without this, name mismatches fail silently in the cron logs.
  const unmatched = allProposals
    .filter((p) => p.matchedBy === "unmatched")
    .map((p) => `${p.homeLabel} ${p.homeScore}-${p.awayScore} ${p.awayLabel}`);
  const today = new Date().toISOString().slice(0, 10);
  const todayStatuses = apiMatches
    .filter((m) => m.utcDate.slice(0, 10) === today)
    .map((m) => `${m.homeTeam.name}-${m.awayTeam.name}: ${m.status}`);
  if (proposals.length === 0) {
    return NextResponse.json({
      ok: true,
      applied: 0,
      unmatched,
      todayStatuses,
    });
  }

  const admin = (await getUserRepository().list()).find((u) => u.isAdmin);
  if (!admin)
    return NextResponse.json({ error: "no admin user" }, { status: 500 });

  for (const p of proposals) {
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
  return NextResponse.json({
    ok: true,
    applied: proposals.length,
    results: proposals.map(
      (p) => `${p.homeLabel} ${p.homeScore}-${p.awayScore} ${p.awayLabel}`,
    ),
    unmatched,
    todayStatuses,
  });
}

export async function POST(req: Request) {
  return sync(req);
}

export async function GET(req: Request) {
  return sync(req);
}

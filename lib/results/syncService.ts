import type { Fixtures } from "../fixtures/types";
import type { MatchRepository } from "../db/matchRepository";
import type { StandingsRepository } from "../db/standingsRepository";
import type { PredictionRepository } from "../db/predictionRepository";
import type { UserRepository } from "../db/userRepository";
import type { TeamStatusRepository } from "../db/teamStatusRepository";
import {
  proposalsFromApi,
  pairingsFromApi,
  filterNewResults,
  liveFromApi,
  type ApiMatch,
  type MatchLabels,
} from "./footballData";
import { knockoutLosers } from "./eliminations";
import { recomputeStandings } from "./recompute";

/** Orchestration error carrying the HTTP status the cron route should answer
 *  with (502 = upstream fetch failed, 500 = no admin to attribute results to). */
export class SyncError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SyncError";
  }
}

export interface SyncDeps {
  fixtures: Fixtures;
  matchRepo: MatchRepository;
  standingsRepo: StandingsRepository;
  predRepo: PredictionRepository;
  userRepo: UserRepository;
  teamStatusRepo: TeamStatusRepository;
  /** Injected so the route wires the football-data client and tests wire a stub. */
  fetchMatches: () => Promise<ApiMatch[]>;
  /** Defaults to now; injectable so `todayStatuses` is deterministic in tests. */
  now?: Date;
}

export interface SyncResult {
  ok: boolean;
  applied: number;
  results: string[];
  paired: string[];
  live: string[];
  eliminated: string[];
  unmatched: string[];
  todayStatuses: string[];
}

/** Unattended results sync, free of any HTTP/auth concern so it can be unit
 *  tested with in-memory repositories. Four phases: (1) pair newly seeded
 *  knockout slots with real teams, (2) apply new/corrected finished results
 *  and recompute standings only when something changed, (3) mirror in-play
 *  scores (which never affect scoring — matchOutcome requires 'finished'),
 *  (4) mark losers of decided knockout matches as eliminated.
 *
 *  `ok` is false when the api reports a finished match we cannot map; the
 *  route turns that into a non-200 so both cron callers alert on it. */
export async function runResultsSync(deps: SyncDeps): Promise<SyncResult> {
  const {
    fixtures,
    matchRepo,
    standingsRepo,
    predRepo,
    userRepo,
    teamStatusRepo,
  } = deps;
  const now = deps.now ?? new Date();

  const teamName = new Map(fixtures.teams.map((t) => [t.id, t.name]));
  const labels: MatchLabels = {};
  for (const m of fixtures.matches)
    labels[m.id] = { home: m.homeLabel, away: m.awayLabel, kickoff: m.kickoff };

  let apiMatches: ApiMatch[];
  try {
    apiMatches = await deps.fetchMatches();
  } catch (e) {
    throw new SyncError((e as Error).message, 502);
  }

  let ourMatches = await matchRepo.all();

  // Knockout slots already resolved in the db match the api by team name, not
  // by their fixture placeholder ("2A", "W73") — swap in real names.
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
  const fresh = filterNewResults(
    allProposals.filter((p) => p.matchedBy !== "unmatched"),
    ourMatches,
  );

  const unmatched = allProposals
    .filter((p) => p.matchedBy === "unmatched")
    .map((p) => `${p.homeLabel} ${p.homeScore}-${p.awayScore} ${p.awayLabel}`);
  const today = now.toISOString().slice(0, 10);
  const todayStatuses = apiMatches
    .filter((m) => m.utcDate.slice(0, 10) === today)
    .map((m) => `${m.homeTeam.name}-${m.awayTeam.name}: ${m.status}`);

  if (fresh.length > 0) {
    const admin = (await userRepo.list()).find((u) => u.isAdmin);
    if (!admin) throw new SyncError("no admin user", 500);

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
      standingsRepo,
      predRepo,
    });
  }

  // Phase 3: mirror current scores of in-play matches.
  const liveUpdates = liveFromApi(apiMatches, ourMatches, labels);
  for (const l of liveUpdates) {
    await matchRepo.setLiveScore(l.matchId, {
      homeScore: l.homeScore,
      awayScore: l.awayScore,
    });
  }

  // Phase 4: knockout losers are out of every remaining bonus — mark them
  // eliminated so "Kvar att hämta" stops counting picks on them. Admin can
  // still resolve draws (penalty shoot-outs) and revive mistakes by hand.
  if (fresh.length > 0) ourMatches = await matchRepo.all();
  const alreadyOut = new Set(await teamStatusRepo.getEliminated());
  const newlyOut = knockoutLosers(ourMatches).filter(
    (id) => !alreadyOut.has(id),
  );
  for (const id of newlyOut) {
    await teamStatusRepo.setEliminated(id, true);
  }

  return {
    ok: unmatched.length === 0,
    applied: fresh.length,
    results: fresh.map(
      (p) => `${p.homeLabel} ${p.homeScore}-${p.awayScore} ${p.awayLabel}`,
    ),
    paired: pairings.map((p) => `${p.matchId}: ${p.homeName}-${p.awayName}`),
    live: liveUpdates.map((l) => `${l.matchId}: ${l.homeScore}-${l.awayScore}`),
    eliminated: newlyOut,
    unmatched,
    todayStatuses,
  };
}

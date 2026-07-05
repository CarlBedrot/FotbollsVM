import { describe, it, expect } from "vitest";
import { runResultsSync, SyncError, type SyncDeps } from "./syncService";
import type { ApiMatch } from "./footballData";
import type { Fixtures } from "../fixtures/types";
import type { Match } from "../domain/types";
import { InMemoryMatchRepository } from "../db/inMemoryMatchRepository";
import { InMemoryStandingsRepository } from "../db/inMemoryStandingsRepository";
import { InMemoryPredictionRepository } from "../db/inMemoryPredictionRepository";
import { InMemoryUserRepository } from "../db/inMemoryUserRepository";
import { InMemoryTeamStatusRepository } from "../db/inMemoryTeamStatusRepository";

const fixtures: Fixtures = {
  season: "2026",
  firstKickoff: "2026-06-11T19:00:00.000Z",
  teams: [
    { id: "mexico", name: "Mexico", group: "A" },
    { id: "south-korea", name: "South Korea", group: "A" },
  ],
  matches: [
    {
      id: "G001",
      stage: "group",
      group: "A",
      homeTeamId: "mexico",
      awayTeamId: "south-korea",
      homeLabel: "Mexico",
      awayLabel: "South Korea",
      kickoff: "2026-06-11T19:00:00.000Z",
      ground: "Mexico City",
    },
  ],
};

function scheduledMatch(): Match {
  return {
    id: "G001",
    stage: "group",
    group: "A",
    homeTeamId: "mexico",
    awayTeamId: "south-korea",
    status: "scheduled",
    homeScore: null,
    awayScore: null,
  };
}

function api(
  home: string,
  away: string,
  hs: number,
  as: number,
  status = "FINISHED",
): ApiMatch {
  return {
    utcDate: "2026-06-11T19:00:00Z",
    status,
    homeTeam: { name: home },
    awayTeam: { name: away },
    score: { fullTime: { home: hs, away: as } },
  };
}

async function deps(
  over: Partial<SyncDeps> & { matches?: Match[] } = {},
): Promise<SyncDeps> {
  const userRepo = new InMemoryUserRepository();
  return {
    fixtures,
    matchRepo: new InMemoryMatchRepository(over.matches ?? [scheduledMatch()]),
    standingsRepo: new InMemoryStandingsRepository(),
    predRepo: new InMemoryPredictionRepository(),
    userRepo,
    teamStatusRepo: new InMemoryTeamStatusRepository(),
    fetchMatches: async () => [],
    now: new Date("2026-06-11T21:00:00Z"),
    ...over,
  };
}

async function withAdmin(
  repo: InMemoryUserRepository,
): Promise<InMemoryUserRepository> {
  await repo.create({
    username: "admin",
    displayName: "Admin",
    passwordHash: "x",
    isAdmin: true,
    color: "#000000",
  });
  return repo;
}

describe("runResultsSync", () => {
  it("applies a new finished result and reports ok", async () => {
    const matchRepo = new InMemoryMatchRepository([scheduledMatch()]);
    const userRepo = await withAdmin(new InMemoryUserRepository());
    const d = await deps({
      matchRepo,
      userRepo,
      fetchMatches: async () => [api("Mexico", "South Korea", 2, 1)],
    });

    const result = await runResultsSync(d);

    expect(result.ok).toBe(true);
    expect(result.applied).toBe(1);
    expect(result.results).toEqual(["Mexico 2-1 South Korea"]);
    expect(result.unmatched).toEqual([]);
    const [stored] = await matchRepo.all();
    expect(stored).toMatchObject({
      status: "finished",
      homeScore: 2,
      awayScore: 1,
    });
  });

  it("reports ok=false and lists a finished match it cannot map", async () => {
    const d = await deps({
      fetchMatches: async () => [api("Brazil", "Spain", 3, 0)],
    });

    const result = await runResultsSync(d);

    expect(result.ok).toBe(false);
    expect(result.applied).toBe(0);
    expect(result.unmatched).toEqual(["Brazil 3-0 Spain"]);
  });

  it("throws SyncError 500 when there is a result to apply but no admin user", async () => {
    const d = await deps({
      fetchMatches: async () => [api("Mexico", "South Korea", 2, 1)],
    });

    await expect(runResultsSync(d)).rejects.toMatchObject({
      name: "SyncError",
      status: 500,
    });
  });

  it("throws SyncError 502 when the upstream fetch fails", async () => {
    const d = await deps({
      fetchMatches: async () => {
        throw new Error("football-data 429");
      },
    });

    await expect(runResultsSync(d)).rejects.toMatchObject({
      name: "SyncError",
      status: 502,
      message: "football-data 429",
    });
  });

  it("marks the loser of a finished knockout match as eliminated", async () => {
    const knockout: Match = {
      id: "K90",
      stage: "r16",
      group: null,
      homeTeamId: "mexico",
      awayTeamId: "south-korea",
      status: "finished",
      homeScore: 0,
      awayScore: 3,
    };
    const teamStatusRepo = new InMemoryTeamStatusRepository();
    const d = await deps({
      matches: [scheduledMatch(), knockout],
      teamStatusRepo,
    });

    const result = await runResultsSync(d);

    expect(result.eliminated).toEqual(["mexico"]);
    expect(await teamStatusRepo.getEliminated()).toEqual(["mexico"]);
  });

  it("does not re-report a loser that is already eliminated", async () => {
    const knockout: Match = {
      id: "K90",
      stage: "r16",
      group: null,
      homeTeamId: "mexico",
      awayTeamId: "south-korea",
      status: "finished",
      homeScore: 0,
      awayScore: 3,
    };
    const teamStatusRepo = new InMemoryTeamStatusRepository();
    await teamStatusRepo.setEliminated("mexico", true);
    const d = await deps({ matches: [knockout], teamStatusRepo });

    const result = await runResultsSync(d);

    expect(result.eliminated).toEqual([]);
    expect(await teamStatusRepo.getEliminated()).toEqual(["mexico"]);
  });

  it("does nothing and stays ok when the api reports no relevant matches", async () => {
    const matchRepo = new InMemoryMatchRepository([scheduledMatch()]);
    const d = await deps({ matchRepo, fetchMatches: async () => [] });

    const result = await runResultsSync(d);

    expect(result).toMatchObject({ ok: true, applied: 0, unmatched: [] });
    const [stored] = await matchRepo.all();
    expect(stored.status).toBe("scheduled");
  });
});

// SyncError carries its status for the route to map to HTTP.
describe("SyncError", () => {
  it("exposes message + status", () => {
    const err = new SyncError("boom", 502);
    expect(err.status).toBe(502);
    expect(err.message).toBe("boom");
  });
});

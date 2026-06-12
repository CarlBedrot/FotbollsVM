// lib/results/footballData.test.ts
import { describe, it, expect } from "vitest";
import type { Match } from "../domain/types";
import {
  proposalsFromApi,
  pairingsFromApi,
  filterNewResults,
  liveFromApi,
  type ApiMatch,
} from "./footballData";

const ourMatches: Match[] = [
  {
    id: "G001",
    stage: "group",
    group: "A",
    homeTeamId: "mexico",
    awayTeamId: "south-korea",
    status: "scheduled",
    homeScore: null,
    awayScore: null,
  },
  {
    id: "G002",
    stage: "group",
    group: "B",
    homeTeamId: "usa",
    awayTeamId: "paraguay",
    status: "scheduled",
    homeScore: null,
    awayScore: null,
  },
];
const labels: Record<string, { home: string; away: string; kickoff: string }> =
  {
    G001: {
      home: "Mexico",
      away: "South Korea",
      kickoff: "2026-06-11T19:00:00.000Z",
    },
    G002: {
      home: "USA",
      away: "Paraguay",
      kickoff: "2026-06-13T19:00:00.000Z",
    },
  };

function api(
  date: string,
  home: string,
  away: string,
  hs: number | null,
  as: number | null,
  status = "FINISHED",
): ApiMatch {
  return {
    utcDate: date,
    status,
    homeTeam: { name: home },
    awayTeam: { name: away },
    score: { fullTime: { home: hs, away: as } },
  };
}

describe("proposalsFromApi", () => {
  it("matches finished api matches to our matches by date + team names", () => {
    const apiMatches = [
      api("2026-06-11T19:00:00Z", "Mexico", "South Korea", 2, 1),
    ];
    const proposals = proposalsFromApi(apiMatches, ourMatches, labels);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({
      matchId: "G001",
      homeScore: 2,
      awayScore: 1,
      matchedBy: "exact",
    });
  });

  it("uses the alias table for differing names (Korea Republic → South Korea)", () => {
    const apiMatches = [
      api("2026-06-11T19:00:00Z", "Mexico", "Korea Republic", 0, 0),
    ];
    const proposals = proposalsFromApi(apiMatches, ourMatches, labels);
    expect(proposals[0]).toMatchObject({ matchId: "G001", matchedBy: "alias" });
  });

  it('matches "Bosnia-Herzegovina" (real football-data name) against our "Bosnia & Herzegovina"', () => {
    const matches: Match[] = [
      {
        id: "G007",
        stage: "group",
        group: "B",
        homeTeamId: "canada",
        awayTeamId: "bosnia-and-herzegovina",
        status: "scheduled",
        homeScore: null,
        awayScore: null,
      },
    ];
    const labs = {
      G007: {
        home: "Canada",
        away: "Bosnia & Herzegovina",
        kickoff: "2026-06-12T19:00:00.000Z",
      },
    };
    const apiMatches = [
      api("2026-06-12T19:00:00Z", "Canada", "Bosnia-Herzegovina", 1, 1),
    ];
    const proposals = proposalsFromApi(apiMatches, matches, labs);
    expect(proposals[0]).toMatchObject({
      matchId: "G007",
      homeScore: 1,
      awayScore: 1,
      matchedBy: "alias",
    });
  });

  it('matches "Bosnia and Herzegovina" against our "Bosnia & Herzegovina"', () => {
    const matches: Match[] = [
      {
        id: "G007",
        stage: "group",
        group: "B",
        homeTeamId: "canada",
        awayTeamId: "bosnia-and-herzegovina",
        status: "scheduled",
        homeScore: null,
        awayScore: null,
      },
    ];
    const labs = {
      G007: {
        home: "Canada",
        away: "Bosnia & Herzegovina",
        kickoff: "2026-06-12T19:00:00.000Z",
      },
    };
    const apiMatches = [
      api("2026-06-12T19:00:00Z", "Canada", "Bosnia and Herzegovina", 3, 1),
    ];
    const proposals = proposalsFromApi(apiMatches, matches, labs);
    expect(proposals[0]).toMatchObject({
      matchId: "G007",
      homeScore: 3,
      awayScore: 1,
    });
  });

  it('matches "Congo DR" against our "DR Congo"', () => {
    const matches: Match[] = [
      {
        id: "G020",
        stage: "group",
        group: "C",
        homeTeamId: "dr-congo",
        awayTeamId: "paraguay",
        status: "scheduled",
        homeScore: null,
        awayScore: null,
      },
    ];
    const labs = {
      G020: {
        home: "DR Congo",
        away: "Paraguay",
        kickoff: "2026-06-14T19:00:00.000Z",
      },
    };
    const apiMatches = [
      api("2026-06-14T19:00:00Z", "Congo DR", "Paraguay", 1, 1),
    ];
    const proposals = proposalsFromApi(apiMatches, matches, labs);
    expect(proposals[0]).toMatchObject({ matchId: "G020", matchedBy: "alias" });
  });

  it("ignores non-finished api matches", () => {
    const apiMatches = [
      api(
        "2026-06-11T19:00:00Z",
        "Mexico",
        "South Korea",
        null,
        null,
        "SCHEDULED",
      ),
    ];
    expect(proposalsFromApi(apiMatches, ourMatches, labels)).toHaveLength(0);
  });

  it("flags an api match it cannot map to any of our matches", () => {
    const apiMatches = [
      api("2099-01-01T00:00:00Z", "Narnia", "Atlantis", 1, 0),
    ];
    const proposals = proposalsFromApi(apiMatches, ourMatches, labels);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].matchedBy).toBe("unmatched");
    expect(proposals[0].matchId).toBe("");
  });
});

describe("pairingsFromApi", () => {
  const teams = [
    { id: "sweden", name: "Sweden" },
    { id: "turkey", name: "Turkey" },
    { id: "usa", name: "USA" },
  ];
  const koMatch: Match = {
    id: "K73",
    stage: "r32",
    group: null,
    homeTeamId: null,
    awayTeamId: null,
    status: "scheduled",
    homeScore: null,
    awayScore: null,
  };
  const koLabels = {
    K73: { home: "2A", away: "2B", kickoff: "2026-06-29T19:00:00.000Z" },
  };

  it("resolves a knockout slot when the api lists real teams at the same kickoff", () => {
    const apiMatches = [
      api("2026-06-29T19:00:00Z", "Sweden", "Turkiye", null, null, "TIMED"),
    ];
    const pairings = pairingsFromApi(apiMatches, [koMatch], koLabels, teams);
    expect(pairings).toEqual([
      {
        matchId: "K73",
        homeTeamId: "sweden",
        awayTeamId: "turkey",
        homeName: "Sweden",
        awayName: "Turkey",
      },
    ]);
  });

  it("skips slots whose api teams are still placeholders", () => {
    const apiMatches = [
      api(
        "2026-06-29T19:00:00Z",
        "Winner Group A",
        "Runner-up Group B",
        null,
        null,
        "SCHEDULED",
      ),
    ];
    expect(
      pairingsFromApi(apiMatches, [koMatch], koLabels, teams),
    ).toHaveLength(0);
  });

  it("never pairs group-stage matches", () => {
    const groupMatch: Match = {
      ...koMatch,
      id: "G001",
      stage: "group",
      group: "A",
    };
    const labs = {
      G001: {
        home: "Sweden",
        away: "USA",
        kickoff: "2026-06-29T19:00:00.000Z",
      },
    };
    const apiMatches = [
      api("2026-06-29T19:00:00Z", "Sweden", "USA", null, null, "TIMED"),
    ];
    expect(pairingsFromApi(apiMatches, [groupMatch], labs, teams)).toHaveLength(
      0,
    );
  });

  it("skips slots that are already resolved", () => {
    const resolved: Match = {
      ...koMatch,
      homeTeamId: "sweden",
      awayTeamId: "turkey",
    };
    const apiMatches = [
      api("2026-06-29T19:00:00Z", "Sweden", "Turkiye", null, null, "TIMED"),
    ];
    expect(
      pairingsFromApi(apiMatches, [resolved], koLabels, teams),
    ).toHaveLength(0);
  });
});

describe("filterNewResults", () => {
  const proposal = {
    matchId: "G001",
    homeLabel: "Mexico",
    awayLabel: "South Korea",
    homeScore: 2,
    awayScore: 1,
    matchedBy: "exact" as const,
  };

  it("keeps results for matches without a stored result", () => {
    const m: Match = {
      id: "G001",
      stage: "group",
      group: "A",
      homeTeamId: "mexico",
      awayTeamId: "south-korea",
      status: "live",
      homeScore: 2,
      awayScore: 1,
    };
    expect(filterNewResults([proposal], [m])).toHaveLength(1);
  });

  it("drops results already applied with identical scores", () => {
    const m: Match = {
      id: "G001",
      stage: "group",
      group: "A",
      homeTeamId: "mexico",
      awayTeamId: "south-korea",
      status: "finished",
      homeScore: 2,
      awayScore: 1,
    };
    expect(filterNewResults([proposal], [m])).toHaveLength(0);
  });

  it("keeps corrections where the stored score differs", () => {
    const m: Match = {
      id: "G001",
      stage: "group",
      group: "A",
      homeTeamId: "mexico",
      awayTeamId: "south-korea",
      status: "finished",
      homeScore: 1,
      awayScore: 1,
    };
    expect(filterNewResults([proposal], [m])).toHaveLength(1);
  });
});

describe("liveFromApi", () => {
  const m: Match = {
    id: "G001",
    stage: "group",
    group: "A",
    homeTeamId: "mexico",
    awayTeamId: "south-korea",
    status: "scheduled",
    homeScore: null,
    awayScore: null,
  };
  const labs = {
    G001: {
      home: "Mexico",
      away: "South Korea",
      kickoff: "2026-06-11T19:00:00.000Z",
    },
  };

  it("reports the current score for an in-play match", () => {
    const apiMatches = [
      api("2026-06-11T19:00:00Z", "Mexico", "Korea Republic", 1, 0, "IN_PLAY"),
    ];
    expect(liveFromApi(apiMatches, [m], labs)).toEqual([
      { matchId: "G001", homeScore: 1, awayScore: 0 },
    ]);
  });

  it("treats a paused match with no score yet as 0-0", () => {
    const apiMatches = [
      api(
        "2026-06-11T19:00:00Z",
        "Mexico",
        "South Korea",
        null,
        null,
        "PAUSED",
      ),
    ];
    expect(liveFromApi(apiMatches, [m], labs)).toEqual([
      { matchId: "G001", homeScore: 0, awayScore: 0 },
    ]);
  });

  it("skips matches already finished locally", () => {
    const done: Match = {
      ...m,
      status: "finished",
      homeScore: 2,
      awayScore: 1,
    };
    const apiMatches = [
      api("2026-06-11T19:00:00Z", "Mexico", "South Korea", 2, 1, "IN_PLAY"),
    ];
    expect(liveFromApi(apiMatches, [done], labs)).toHaveLength(0);
  });

  it("skips unchanged live scores", () => {
    const liveM: Match = { ...m, status: "live", homeScore: 1, awayScore: 0 };
    const apiMatches = [
      api("2026-06-11T19:00:00Z", "Mexico", "South Korea", 1, 0, "IN_PLAY"),
    ];
    expect(liveFromApi(apiMatches, [liveM], labs)).toHaveLength(0);
  });
});

import { describe, it, expect } from "vitest";
import { toMatchViews } from "./matchView";
import type { Match } from "../domain/types";
import type { Fixtures } from "../fixtures/types";

const fixtures: Fixtures = {
  season: "2026",
  firstKickoff: "2026-06-11T19:00:00Z",
  teams: [],
  matches: [
    {
      id: "G001",
      stage: "group",
      group: "A",
      homeTeamId: "mexico",
      awayTeamId: "south-korea",
      homeLabel: "Mexico",
      awayLabel: "South Korea",
      kickoff: "2026-06-11T19:00:00Z",
      ground: "Mexico City",
    },
  ],
};

describe("toMatchViews", () => {
  it("merges db result onto fixture labels + derives outcome", () => {
    const db: Match[] = [
      {
        id: "G001",
        stage: "group",
        group: "A",
        homeTeamId: "mexico",
        awayTeamId: "south-korea",
        status: "finished",
        homeScore: 2,
        awayScore: 1,
      },
    ];
    const [v] = toMatchViews(db, fixtures);
    expect(v).toMatchObject({
      id: "G001",
      homeLabel: "Mexico",
      awayLabel: "South Korea",
      status: "finished",
      homeScore: 2,
      awayScore: 1,
      outcome: "1",
    });
  });
  it("falls back to fixture (scheduled) when there is no db row", () => {
    const [v] = toMatchViews([], fixtures);
    expect(v).toMatchObject({
      id: "G001",
      status: "scheduled",
      homeScore: null,
      outcome: null,
    });
  });
  it("replaces knockout placeholder labels with team names once the db slot is resolved", () => {
    const koFixtures: Fixtures = {
      ...fixtures,
      teams: [
        { id: "sweden", name: "Sweden", group: "A" },
        { id: "turkey", name: "Turkey", group: "B" },
      ],
      matches: [
        {
          id: "K73",
          stage: "r32",
          group: null,
          homeTeamId: null,
          awayTeamId: null,
          homeLabel: "2A",
          awayLabel: "2B",
          kickoff: "2026-06-29T19:00:00Z",
          ground: "Boston",
        },
      ],
    };
    const db: Match[] = [
      {
        id: "K73",
        stage: "r32",
        group: null,
        homeTeamId: "sweden",
        awayTeamId: "turkey",
        status: "scheduled",
        homeScore: null,
        awayScore: null,
      },
    ];
    const [v] = toMatchViews(db, koFixtures);
    expect(v).toMatchObject({
      id: "K73",
      homeLabel: "Sweden",
      awayLabel: "Turkey",
    });
  });
});

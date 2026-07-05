import { describe, it, expect } from "vitest";
import { knockoutLosers } from "./eliminations";
import type { Match, Stage } from "../domain/types";

function match(over: Partial<Match> & { id: string; stage: Stage }): Match {
  return {
    group: null,
    homeTeamId: "home",
    awayTeamId: "away",
    status: "finished",
    homeScore: 1,
    awayScore: 0,
    ...over,
  };
}

describe("knockoutLosers", () => {
  it("returns the loser of each finished r32/r16/qf match", () => {
    const matches: Match[] = [
      match({
        id: "K73",
        stage: "r32",
        homeTeamId: "sweden",
        awayTeamId: "france",
        homeScore: 0,
        awayScore: 3,
      }),
      match({
        id: "K90",
        stage: "r16",
        homeTeamId: "canada",
        awayTeamId: "morocco",
        homeScore: 0,
        awayScore: 3,
      }),
      match({
        id: "K97",
        stage: "qf",
        homeTeamId: "france",
        awayTeamId: "morocco",
        homeScore: 2,
        awayScore: 1,
      }),
    ];
    expect(knockoutLosers(matches)).toEqual(["sweden", "canada", "morocco"]);
  });

  it("ignores group, sf, bronze and final matches", () => {
    const matches: Match[] = [
      match({ id: "G001", stage: "group", group: "A" }),
      match({ id: "K101", stage: "sf" }),
      match({ id: "K_31", stage: "bronze" }),
      match({ id: "K_32", stage: "final" }),
    ];
    expect(knockoutLosers(matches)).toEqual([]);
  });

  it("ignores unfinished matches and knockout draws", () => {
    const matches: Match[] = [
      match({
        id: "K91",
        stage: "r16",
        status: "scheduled",
        homeScore: null,
        awayScore: null,
      }),
      match({
        id: "K92",
        stage: "r16",
        status: "live",
        homeScore: 2,
        awayScore: 0,
      }),
      match({ id: "K93", stage: "r16", homeScore: 1, awayScore: 1 }),
    ];
    expect(knockoutLosers(matches)).toEqual([]);
  });

  it("skips matches whose losing slot has no team assigned", () => {
    const matches: Match[] = [
      match({
        id: "K94",
        stage: "r16",
        awayTeamId: null,
        homeScore: 1,
        awayScore: 0,
      }),
      match({
        id: "K95",
        stage: "r16",
        homeTeamId: null,
        homeScore: 0,
        awayScore: 1,
      }),
    ];
    expect(knockoutLosers(matches)).toEqual([]);
  });
});

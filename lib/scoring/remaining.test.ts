import { describe, it, expect } from "vitest";
import { computeRemaining, type RemainingPrediction } from "./remaining";

const NONE = { finalists: false, bronze: false, champion: false };

function byKey(user: ReturnType<typeof computeRemaining>[number]) {
  return new Map(user.categories.map((c) => [c.key, c]));
}

describe("computeRemaining", () => {
  it("sums every alive pick when nothing is decided (optimistic ceiling)", () => {
    const preds: RemainingPrediction[] = [
      {
        userId: "a",
        bonus: {
          finalist_1: "BRA",
          finalist_2: "ARG",
          bronze: "FRA",
          champion: "BRA",
        },
      },
    ];
    const [r] = computeRemaining({
      predictions: preds,
      eliminatedTeamIds: [],
      decided: NONE,
    });
    // 8 + 8 + 8 + 16
    expect(r.reachable).toBe(40);
    expect(r.categories.every((c) => c.counts)).toBe(true);
  });

  it("drops a category when its team is eliminated", () => {
    const preds: RemainingPrediction[] = [
      {
        userId: "a",
        bonus: { finalist_1: "BRA", champion: "BRA", bronze: "FRA" },
      },
    ];
    const [r] = computeRemaining({
      predictions: preds,
      eliminatedTeamIds: ["BRA"],
      decided: NONE,
    });
    // BRA out -> finalist_1 (8) and champion (16) gone; bronze FRA (8) stays
    expect(r.reachable).toBe(8);
    const cats = byKey(r);
    expect(cats.get("finalist_1")!.alive).toBe(false);
    expect(cats.get("champion")!.alive).toBe(false);
    expect(cats.get("bronze")!.counts).toBe(true);
  });

  it("drops a category once its deciding match is played (avoids double count)", () => {
    const preds: RemainingPrediction[] = [
      { userId: "a", bonus: { champion: "BRA", bronze: "FRA" } },
    ];
    const [r] = computeRemaining({
      predictions: preds,
      eliminatedTeamIds: [],
      decided: { finalists: false, bronze: false, champion: true },
    });
    // champion decided -> its 16 no longer "remaining"; bronze still open
    expect(r.reachable).toBe(8);
    expect(byKey(r).get("champion")!.counts).toBe(false);
    expect(byKey(r).get("champion")!.decided).toBe(true);
  });

  it("both finalists share the finalists-decided flag", () => {
    const preds: RemainingPrediction[] = [
      { userId: "a", bonus: { finalist_1: "BRA", finalist_2: "ARG" } },
    ];
    const [r] = computeRemaining({
      predictions: preds,
      eliminatedTeamIds: [],
      decided: { finalists: true, bronze: false, champion: false },
    });
    expect(r.reachable).toBe(0);
    expect(
      r.categories
        .filter((c) => c.key.startsWith("finalist"))
        .every((c) => c.decided),
    ).toBe(true);
  });

  it("a bronze pick on a team headed to the final cannot count", () => {
    const preds: RemainingPrediction[] = [
      { userId: "a", bonus: { bronze: "ESP", champion: "ESP" } },
    ];
    const [r] = computeRemaining({
      predictions: preds,
      eliminatedTeamIds: [],
      decided: NONE,
      finalistTeamIds: ["ESP", "FRA"],
    });
    // ESP plays the final: bronze (8) impossible, champion (16) still open
    expect(r.reachable).toBe(16);
    const cats = byKey(r);
    expect(cats.get("bronze")!.feasible).toBe(false);
    expect(cats.get("bronze")!.alive).toBe(true);
    expect(cats.get("champion")!.counts).toBe(true);
  });

  it("finalist/champion picks on a semifinal loser cannot count, but bronze can", () => {
    const preds: RemainingPrediction[] = [
      { userId: "a", bonus: { finalist_1: "BRA", champion: "BRA", bronze: "BRA" } },
    ];
    const [r] = computeRemaining({
      predictions: preds,
      eliminatedTeamIds: [],
      decided: NONE,
      semifinalLoserIds: ["BRA"],
    });
    // BRA lost its semifinal: finalist (8) and champion (16) gone, bronze (8) lives
    expect(r.reachable).toBe(8);
    const cats = byKey(r);
    expect(cats.get("finalist_1")!.feasible).toBe(false);
    expect(cats.get("champion")!.feasible).toBe(false);
    expect(cats.get("bronze")!.counts).toBe(true);
  });

  it("missing picks contribute nothing", () => {
    const [r] = computeRemaining({
      predictions: [{ userId: "a", bonus: {} }],
      eliminatedTeamIds: [],
      decided: NONE,
    });
    expect(r.reachable).toBe(0);
    expect(r.categories.every((c) => c.teamId === null && !c.counts)).toBe(
      true,
    );
  });
});

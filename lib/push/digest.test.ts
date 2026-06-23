import { describe, it, expect } from "vitest";
import { buildDailyDigest } from "./digest";
import type { Standing } from "../results/types";
import type { UserRecord } from "../db/userRepository";

function standing(userId: string, rank: number, totalPoints: number): Standing {
  return {
    userId,
    rank,
    prevRank: null,
    totalPoints,
    matchPoints: totalPoints,
    bonusPoints: 0,
    breakdown: {} as Standing["breakdown"],
  };
}

function user(id: string, displayName: string): UserRecord {
  return {
    id,
    username: id,
    displayName,
    passwordHash: "",
    isAdmin: false,
    avatarUrl: null,
    color: "#000000",
    createdAt: "2026-06-01T00:00:00Z",
  };
}

const users = [user("a", "Anna"), user("b", "Bosse"), user("c", "Calle")];

describe("buildDailyDigest", () => {
  it("first run sends a baseline message naming the leader, with no movement arrows", () => {
    const standings = [
      standing("a", 1, 30),
      standing("b", 2, 20),
      standing("c", 3, 10),
    ];

    const plan = buildDailyDigest(standings, users, null);

    expect(plan.shouldSend).toBe(true);
    expect(plan.reason).toBe("first-run");
    expect(plan.leader?.displayName).toBe("Anna");
    expect(plan.messages).toHaveLength(3);
    const bosse = plan.messages.find((m) => m.userId === "b")!;
    expect(bosse.body).toContain("Anna");
    expect(bosse.body).not.toMatch(/[▲▼]/);
  });

  it("skips entirely when standings are byte-for-byte unchanged since last push", () => {
    const standings = [standing("a", 1, 30), standing("b", 2, 20)];
    const prev = buildDailyDigest(standings, users, null).snapshot;

    const plan = buildDailyDigest(standings, users, prev);

    expect(plan.shouldSend).toBe(false);
    expect(plan.reason).toBe("no-change");
    expect(plan.messages).toHaveLength(0);
  });

  it("announces a new leader when the top spot changes hands", () => {
    const before = [standing("a", 1, 30), standing("b", 2, 20)];
    const prev = buildDailyDigest(before, users, null).snapshot;
    const after = [standing("b", 1, 40), standing("a", 2, 30)];

    const plan = buildDailyDigest(after, users, prev);

    expect(plan.shouldSend).toBe(true);
    expect(plan.reason).toBe("leader-change");
    expect(plan.leader?.displayName).toBe("Bosse");
    const anna = plan.messages.find((m) => m.userId === "a")!;
    expect(anna.title).toContain("Ny ledare");
    expect(anna.body).toContain("Bosse");
  });

  it("reports per-user movement with up/down arrows since the last push", () => {
    const before = [
      standing("a", 1, 30),
      standing("b", 2, 20),
      standing("c", 3, 10),
    ];
    const prev = buildDailyDigest(before, users, null).snapshot;
    // points changed (so not a no-change skip) and Calle climbs past Bosse
    const after = [
      standing("a", 1, 30),
      standing("c", 2, 25),
      standing("b", 3, 20),
    ];

    const plan = buildDailyDigest(after, users, prev);

    expect(plan.shouldSend).toBe(true);
    expect(plan.reason).toBe("movement");
    const calle = plan.messages.find((m) => m.userId === "c")!;
    expect(calle.body).toContain("▲1");
    const bosse = plan.messages.find((m) => m.userId === "b")!;
    expect(bosse.body).toContain("▼1");
  });

  it("addresses the leader in second person rather than naming them", () => {
    const before = [standing("a", 1, 30), standing("b", 2, 20)];
    const prev = buildDailyDigest(before, users, null).snapshot;
    const after = [standing("a", 1, 35), standing("b", 2, 20)];

    const plan = buildDailyDigest(after, users, prev);

    const anna = plan.messages.find((m) => m.userId === "a")!;
    expect(anna.body.toLowerCase()).toContain("du leder");
  });

  it("only messages users who have a standing row", () => {
    const standings = [standing("a", 1, 30)];

    const plan = buildDailyDigest(standings, users, null);

    expect(plan.messages.map((m) => m.userId)).toEqual(["a"]);
  });
});

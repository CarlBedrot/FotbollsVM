import { describe, it, expect } from "vitest";
import {
  runDailyPush,
  PushGoneError,
  type PushSender,
} from "./dailyPushService";
import type { DigestSnapshot } from "./digest";
import type { Standing } from "../results/types";
import type { UserRecord } from "../db/userRepository";
import type { SettingsRepository } from "../db/settingsRepository";
import { InMemoryStandingsRepository } from "../db/inMemoryStandingsRepository";
import { InMemoryPushSubscriptionRepository } from "../db/inMemoryPushSubscriptionRepository";
import type { UserRepository } from "../db/userRepository";

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

/** Minimal UserRepository exposing only what the service uses. */
function userRepoOf(users: UserRecord[]): UserRepository {
  return {
    list: async () => users,
  } as unknown as UserRepository;
}

function settingsRepoOf(initial: DigestSnapshot | null): SettingsRepository {
  let snap = initial;
  return {
    getLockAt: async () => null,
    getLastDigest: async () => snap,
    setLastDigest: async (s) => {
      snap = s;
    },
  };
}

async function fixture(opts: {
  standings: Standing[];
  users: UserRecord[];
  subs: { endpoint: string; userId: string }[];
  prev: DigestSnapshot | null;
  sender?: PushSender;
}) {
  const standingsRepo = new InMemoryStandingsRepository();
  await standingsRepo.replaceAll(opts.standings);
  const subsRepo = new InMemoryPushSubscriptionRepository();
  for (const s of opts.subs)
    await subsRepo.upsert({
      endpoint: s.endpoint,
      userId: s.userId,
      p256dh: "k",
      auth: "a",
    });
  const settings = settingsRepoOf(opts.prev);
  const sent: { endpoint: string; title: string; body: string }[] = [];
  const sender: PushSender =
    opts.sender ??
    (async (rec, payload) => {
      sent.push({ endpoint: rec.endpoint, ...payload });
    });
  const result = await runDailyPush({
    standingsRepo,
    userRepo: userRepoOf(opts.users),
    subsRepo,
    settings,
    sendPush: sender,
  });
  return { result, sent, subsRepo, settings };
}

const users = [user("a", "Anna"), user("b", "Bosse")];

describe("runDailyPush", () => {
  it("sends a personalised message to every subscription of every player", async () => {
    const { result, sent } = await fixture({
      standings: [standing("a", 1, 30), standing("b", 2, 20)],
      users,
      subs: [
        { endpoint: "e-a1", userId: "a" },
        { endpoint: "e-a2", userId: "a" },
        { endpoint: "e-b1", userId: "b" },
      ],
      prev: null,
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.sent).toBe(3);
    expect(sent.find((s) => s.endpoint === "e-b1")!.body).toContain("Anna");
    expect(
      sent.find((s) => s.endpoint === "e-a1")!.body.toLowerCase(),
    ).toContain("du leder");
  });

  it("skips sending and persists nothing when nothing changed overnight", async () => {
    const standings = [standing("a", 1, 30), standing("b", 2, 20)];
    const first = await fixture({
      standings,
      users,
      subs: [{ endpoint: "e-a1", userId: "a" }],
      prev: null,
    });

    const { result, sent } = await fixture({
      standings,
      users,
      subs: [{ endpoint: "e-a1", userId: "a" }],
      prev: first.result.snapshot,
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("no-change");
    expect(sent).toHaveLength(0);
  });

  it("persists the new snapshot so the next run measures against it", async () => {
    const { settings } = await fixture({
      standings: [standing("a", 1, 30), standing("b", 2, 20)],
      users,
      subs: [{ endpoint: "e-a1", userId: "a" }],
      prev: null,
    });

    const saved = await settings.getLastDigest();
    expect(saved?.leaderId).toBe("a");
  });

  it("prunes a subscription the push service reports as gone (410)", async () => {
    const sender: PushSender = async (rec) => {
      if (rec.endpoint === "dead") throw new PushGoneError("dead");
      throw new PushGoneError("never"); // not reached for live
    };
    const { result, subsRepo } = await fixture({
      standings: [standing("a", 1, 30)],
      users,
      subs: [{ endpoint: "dead", userId: "a" }],
      prev: null,
      sender,
    });

    expect(result.pruned).toBe(1);
    expect(await subsRepo.getAll()).toHaveLength(0);
  });

  it("counts a transient send failure without pruning the subscription", async () => {
    const sender: PushSender = async () => {
      throw new Error("network blip");
    };
    const { result, subsRepo } = await fixture({
      standings: [standing("a", 1, 30)],
      users,
      subs: [{ endpoint: "flaky", userId: "a" }],
      prev: null,
      sender,
    });

    expect(result.failed).toBe(1);
    expect(result.pruned).toBe(0);
    expect(await subsRepo.getAll()).toHaveLength(1);
  });
});

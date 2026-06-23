import type { Standing } from "../results/types";
import type { UserRecord } from "../db/userRepository";

/** Reason a digest run did (or didn't) push, surfaced in the cron response for
 *  log-grepping the same way the sync route exposes `applied`/`unmatched`. */
export type DigestReason =
  | "first-run"
  | "no-change"
  | "leader-change"
  | "movement";

/** Persisted between runs so movement is measured against the *previous push*,
 *  not the previous recompute — several syncs can land between two morning
 *  pushes, so `Standing.prevRank` alone would understate overnight movement. */
export interface DigestSnapshot {
  leaderId: string | null;
  /** userId → rank at the moment of the last push. */
  ranks: Record<string, number>;
  /** Fingerprint of (userId, totalPoints, rank); equal fingerprint = nothing
   *  worth notifying about happened, so the run stays silent. */
  signature: string;
}

export interface DigestMessage {
  userId: string;
  title: string;
  body: string;
}

export interface DigestPlan {
  shouldSend: boolean;
  reason: DigestReason;
  /** The snapshot to persist when a push is sent (callers skip persisting on
   *  `no-change` since it equals the stored one). */
  snapshot: DigestSnapshot;
  leader: { userId: string; displayName: string } | null;
  /** One message per user that has a standing row; empty when not sending. */
  messages: DigestMessage[];
}

function signatureOf(sorted: Standing[]): string {
  return sorted.map((s) => `${s.userId}:${s.totalPoints}:${s.rank}`).join("|");
}

function snapshotOf(
  sorted: Standing[],
  leaderId: string | null,
): DigestSnapshot {
  const ranks: Record<string, number> = {};
  for (const s of sorted) ranks[s.userId] = s.rank;
  return { leaderId, ranks, signature: signatureOf(sorted) };
}

/** `+2` climbed two places (▲2), `-1` dropped one (▼1), 0 unchanged. */
function movementTag(rank: number, prevRank: number | undefined): string {
  if (prevRank === undefined) return "";
  const delta = prevRank - rank;
  if (delta > 0) return ` (▲${delta})`;
  if (delta < 0) return ` (▼${-delta})`;
  return "";
}

function bodyFor(
  s: Standing,
  leaderId: string,
  leaderName: string,
  prev: DigestSnapshot | null,
): string {
  const tag = movementTag(s.rank, prev?.ranks[s.userId]);
  if (s.userId === leaderId) return `Du leder! 👑${tag}`;
  return `${leaderName} toppar — du är #${s.rank}${tag}`;
}

/** Pure planner for the morning digest. Decides whether the push is worth
 *  sending and, if so, builds a personalised message per player. No I/O — the
 *  service layer feeds it repo data and persists the returned snapshot. */
export function buildDailyDigest(
  standings: Standing[],
  users: UserRecord[],
  prev: DigestSnapshot | null,
): DigestPlan {
  const sorted = [...standings].sort((a, b) => a.rank - b.rank);
  const nameById = new Map(users.map((u) => [u.id, u.displayName]));
  const leaderRow = sorted.find((s) => s.rank === 1) ?? sorted[0] ?? null;
  const leaderId = leaderRow?.userId ?? null;
  const leaderName = leaderId ? (nameById.get(leaderId) ?? "Okänd") : "";
  const leader = leaderId
    ? { userId: leaderId, displayName: leaderName }
    : null;
  const snapshot = snapshotOf(sorted, leaderId);

  const silent = (reason: DigestReason): DigestPlan => ({
    shouldSend: false,
    reason,
    snapshot,
    leader,
    messages: [],
  });

  if (sorted.length === 0) return silent("no-change");
  if (prev && prev.signature === snapshot.signature) return silent("no-change");

  const reason: DigestReason = !prev
    ? "first-run"
    : prev.leaderId !== leaderId
      ? "leader-change"
      : "movement";

  const newLeader = reason === "leader-change";
  const title = newLeader ? "Ny ledare! 👑" : "Dagens ställning ⚽";
  const messages: DigestMessage[] = sorted.map((s) => ({
    userId: s.userId,
    title,
    body: bodyFor(s, leaderId!, leaderName, prev),
  }));

  return { shouldSend: true, reason, snapshot, leader, messages };
}

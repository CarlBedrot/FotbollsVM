import type { StandingsRepository } from "../db/standingsRepository";
import type { UserRepository } from "../db/userRepository";
import type {
  PushSubscriptionRepository,
  PushSubscriptionRecord,
} from "../db/pushSubscriptionRepository";
import type { SettingsRepository } from "../db/settingsRepository";
import {
  buildDailyDigest,
  type DigestReason,
  type DigestSnapshot,
} from "./digest";

/** Payload a subscription receives; the service worker reads these fields. */
export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

/** Thrown by a sender when the push service reports the endpoint as gone
 *  (HTTP 404/410). The service prunes these so dead devices don't accumulate. */
export class PushGoneError extends Error {
  constructor(readonly endpoint: string) {
    super(`push endpoint gone: ${endpoint}`);
    this.name = "PushGoneError";
  }
}

/** Injected so the route wires web-push + VAPID and tests wire a stub. Resolves
 *  on delivery, throws `PushGoneError` for dead endpoints, throws anything else
 *  for transient failures. */
export type PushSender = (
  record: PushSubscriptionRecord,
  payload: PushPayload,
) => Promise<void>;

export interface DailyPushDeps {
  standingsRepo: StandingsRepository;
  userRepo: UserRepository;
  subsRepo: PushSubscriptionRepository;
  settings: SettingsRepository;
  sendPush: PushSender;
  /** Where a tapped notification opens; defaults to the app root. */
  appUrl?: string;
}

export interface DailyPushResult {
  ok: boolean;
  reason: DigestReason;
  skipped: boolean;
  recipients: number;
  sent: number;
  failed: number;
  pruned: number;
  snapshot: DigestSnapshot;
}

/** Unattended morning digest, free of HTTP/auth concerns so it runs under the
 *  same in-memory test harness as the results sync. Plans the digest, fans the
 *  per-user message out to every device, prunes dead endpoints, and records the
 *  snapshot only when something was actually sent. */
export async function runDailyPush(
  deps: DailyPushDeps,
): Promise<DailyPushResult> {
  const { standingsRepo, userRepo, subsRepo, settings, sendPush } = deps;
  const appUrl = deps.appUrl ?? "/";

  const [standings, users, prev] = await Promise.all([
    standingsRepo.getAll(),
    userRepo.list(),
    settings.getLastDigest(),
  ]);

  const plan = buildDailyDigest(standings, users, prev);

  if (!plan.shouldSend) {
    return {
      ok: true,
      reason: plan.reason,
      skipped: true,
      recipients: 0,
      sent: 0,
      failed: 0,
      pruned: 0,
      snapshot: plan.snapshot,
    };
  }

  const messageByUser = new Map(plan.messages.map((m) => [m.userId, m]));
  const subs = await subsRepo.getAll();
  const targets = subs.filter((s) => messageByUser.has(s.userId));

  let sent = 0;
  let failed = 0;
  let pruned = 0;

  for (const sub of targets) {
    const message = messageByUser.get(sub.userId)!;
    const payload: PushPayload = {
      title: message.title,
      body: message.body,
      url: appUrl,
    };
    try {
      await sendPush(sub, payload);
      sent += 1;
    } catch (e) {
      if (e instanceof PushGoneError) {
        await subsRepo.deleteByEndpoint(sub.endpoint);
        pruned += 1;
      } else {
        failed += 1;
      }
    }
  }

  await settings.setLastDigest(plan.snapshot);

  return {
    ok: true,
    reason: plan.reason,
    skipped: false,
    recipients: targets.length,
    sent,
    failed,
    pruned,
    snapshot: plan.snapshot,
  };
}

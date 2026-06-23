export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getStandingsRepository,
  getUserRepository,
  getSettingsRepository,
  getPushSubscriptionRepository,
} from "@/lib/db/repository";
import { runDailyPush } from "@/lib/push/dailyPushService";
import { createWebPushSender, vapidFromEnv } from "@/lib/push/webPushSender";
import { jsonError } from "@/lib/api/http";

/** Same dual-secret scheme as the results-sync cron: CRON_SECRET (GitHub
 *  Action) or CRON_SECRET_ALT (cron-job.org), never a user session. */
function authorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  const secrets = [process.env.CRON_SECRET, process.env.CRON_SECRET_ALT].filter(
    Boolean,
  );
  return secrets.length > 0 && secrets.some((s) => auth === `Bearer ${s}`);
}

/** Thin controller: authorize, wire repos + the VAPID-backed sender into the
 *  digest service, return its tally. `skipped:true` is the normal quiet-day
 *  outcome (nothing changed overnight), not an error. */
async function push(req: Request) {
  if (!authorized(req)) return jsonError("forbidden", 403);

  const sendPush = createWebPushSender(vapidFromEnv());
  const appUrl = process.env.APP_URL ?? "https://fotbolls-vm.vercel.app";

  const result = await runDailyPush({
    standingsRepo: getStandingsRepository(),
    userRepo: getUserRepository(),
    subsRepo: getPushSubscriptionRepository(),
    settings: getSettingsRepository(),
    sendPush,
    appUrl,
  });

  return NextResponse.json(result, { status: 200 });
}

export async function POST(req: Request) {
  return push(req);
}

export async function GET(req: Request) {
  return push(req);
}

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { loadFixtures } from "@/lib/fixtures/load";
import {
  getMatchRepository,
  getStandingsRepository,
  getPredictionRepository,
  getUserRepository,
  getTeamStatusRepository,
} from "@/lib/db/repository";
import { fetchWorldCupMatches } from "@/lib/results/footballDataClient";
import { runResultsSync, SyncError } from "@/lib/results/syncService";
import { jsonError } from "@/lib/api/http";

/** Authorized via a bearer token — CRON_SECRET (scheduled GitHub Action) or
 *  CRON_SECRET_ALT (external cron service), never a user session. Two secrets
 *  so either caller can be rotated without touching the other. */
function authorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  const secrets = [process.env.CRON_SECRET, process.env.CRON_SECRET_ALT].filter(
    Boolean,
  );
  return secrets.length > 0 && secrets.some((s) => auth === `Bearer ${s}`);
}

/** Thin controller: authorize, wire repositories + the football-data client
 *  into the sync service, and map its result/errors to HTTP. Non-200 on
 *  unmatched results is the alarm both cron callers watch for. */
async function sync(req: Request) {
  if (!authorized(req)) return jsonError("forbidden", 403);

  try {
    const result = await runResultsSync({
      fixtures: loadFixtures(),
      matchRepo: getMatchRepository(),
      standingsRepo: getStandingsRepository(),
      predRepo: getPredictionRepository(),
      userRepo: getUserRepository(),
      teamStatusRepo: getTeamStatusRepository(),
      fetchMatches: fetchWorldCupMatches,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    if (e instanceof SyncError) return jsonError(e.message, e.status);
    throw e;
  }
}

export async function POST(req: Request) {
  return sync(req);
}

export async function GET(req: Request) {
  return sync(req);
}

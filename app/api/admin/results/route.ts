export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { loadFixtures } from "@/lib/fixtures/load";
import {
  getMatchRepository,
  getStandingsRepository,
  getPredictionRepository,
} from "@/lib/db/repository";
import { recomputeStandings } from "@/lib/results/recompute";
import {
  requireAdminSession,
  readJson,
  isResponse,
  jsonError,
} from "@/lib/api/http";

export async function POST(req: Request) {
  const admin = await requireAdminSession();
  if (isResponse(admin)) return admin;

  const body = await readJson<{
    matchId?: string;
    homeScore?: number;
    awayScore?: number;
  }>(req);
  if (isResponse(body)) return body;

  const { matchId, homeScore, awayScore } = body;
  if (
    !matchId ||
    typeof homeScore !== "number" ||
    typeof awayScore !== "number"
  ) {
    return jsonError("matchId, homeScore, awayScore required", 400);
  }

  const matchRepo = getMatchRepository();
  await matchRepo.setResult(matchId, {
    homeScore,
    awayScore,
    source: "manual",
    updatedBy: admin.userId,
  });
  const standings = await recomputeStandings({
    teams: loadFixtures().teams,
    matchRepo,
    standingsRepo: getStandingsRepository(),
    predRepo: getPredictionRepository(),
  });
  return NextResponse.json({ ok: true, standings });
}

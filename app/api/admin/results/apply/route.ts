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

interface ApplyItem {
  matchId: string;
  homeScore: number;
  awayScore: number;
}

export async function POST(req: Request) {
  const admin = await requireAdminSession();
  if (isResponse(admin)) return admin;

  const body = await readJson<{ results?: ApplyItem[] }>(req);
  if (isResponse(body)) return body;

  const results = body.results ?? [];
  if (!Array.isArray(results) || results.length === 0) {
    return jsonError("no results", 400);
  }

  const matchRepo = getMatchRepository();
  for (const r of results) {
    if (
      !r.matchId ||
      typeof r.homeScore !== "number" ||
      typeof r.awayScore !== "number"
    )
      continue;
    await matchRepo.setResult(r.matchId, {
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      source: "api",
      updatedBy: admin.userId,
    });
  }
  const standings = await recomputeStandings({
    teams: loadFixtures().teams,
    matchRepo,
    standingsRepo: getStandingsRepository(),
    predRepo: getPredictionRepository(),
  });
  return NextResponse.json({ ok: true, applied: results.length, standings });
}

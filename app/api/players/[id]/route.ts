export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getPredictionRepository,
  getUserRepository,
} from "@/lib/db/repository";
import { loadStandingsView, loadMatchViews } from "@/lib/view/serverData";
import { buildPlayerCard } from "@/lib/view/playerCard";
import { loadFixtures } from "@/lib/fixtures/load";
import { isLocked } from "@/lib/tips/lock";
import { requireSession, isResponse, jsonError } from "@/lib/api/http";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSession();
  if (isResponse(guard)) return guard;
  const { id } = await params;

  const [standings, matches, users, predictions] = await Promise.all([
    loadStandingsView(),
    loadMatchViews(),
    getUserRepository().list(),
    getPredictionRepository().all(),
  ]);

  const revealed = isLocked(loadFixtures().firstKickoff, new Date(), null);
  const card = buildPlayerCard({
    userId: id,
    standings,
    users,
    matches,
    predictions,
    revealed,
  });
  if (!card) return jsonError("not found", 404);

  return NextResponse.json({ card });
}

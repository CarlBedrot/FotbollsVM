export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getStandingsRepository } from "@/lib/db/repository";
import { requireSession, isResponse } from "@/lib/api/http";

export async function GET() {
  const guard = await requireSession();
  if (isResponse(guard)) return guard;
  const standings = await getStandingsRepository().getAll();
  standings.sort((a, b) => a.rank - b.rank);
  return NextResponse.json({ standings });
}

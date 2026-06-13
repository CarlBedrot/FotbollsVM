export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getMatchRepository } from "@/lib/db/repository";
import { requireSession, isResponse } from "@/lib/api/http";

export async function GET() {
  const guard = await requireSession();
  if (isResponse(guard)) return guard;
  const matches = await getMatchRepository().all();
  return NextResponse.json({ matches });
}

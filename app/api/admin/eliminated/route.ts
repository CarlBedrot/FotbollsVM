export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getTeamStatusRepository } from "@/lib/db/repository";
import {
  requireAdminSession,
  readJson,
  isResponse,
  jsonError,
} from "@/lib/api/http";

export async function POST(req: Request) {
  const admin = await requireAdminSession();
  if (isResponse(admin)) return admin;

  const body = await readJson<{ teamId?: string; eliminated?: boolean }>(req);
  if (isResponse(body)) return body;

  const { teamId, eliminated } = body;
  if (!teamId || typeof eliminated !== "boolean") {
    return jsonError("teamId and eliminated required", 400);
  }

  await getTeamStatusRepository().setEliminated(teamId, eliminated);
  return NextResponse.json({ ok: true });
}

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getPredictionRepository } from "@/lib/db/repository";
import {
  requireAdminSession,
  readJson,
  isResponse,
  jsonError,
} from "@/lib/api/http";

export async function POST(req: Request) {
  const guard = await requireAdminSession();
  if (isResponse(guard)) return guard;

  const body = await readJson<{ userId?: string; unlocked?: boolean }>(req);
  if (isResponse(body)) return body;

  if (!body.userId) return jsonError("userId required", 400);
  await getPredictionRepository().setUnlock(body.userId, body.unlocked ?? true);
  return NextResponse.json({ ok: true });
}

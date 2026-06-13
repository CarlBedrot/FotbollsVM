export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getUserRepository } from "@/lib/db/repository";
import {
  requireSession,
  readJson,
  isResponse,
  jsonError,
} from "@/lib/api/http";

export async function GET() {
  const session = await requireSession();
  if (isResponse(session)) return session;

  const rec = await getUserRepository().findById(session.userId);
  if (!rec) return jsonError("not found", 404);
  return NextResponse.json({
    user: {
      id: rec.id,
      username: rec.username,
      displayName: rec.displayName,
      color: rec.color,
      avatarUrl: rec.avatarUrl,
      isAdmin: rec.isAdmin,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await requireSession();
  if (isResponse(session)) return session;

  const body = await readJson<{ displayName?: string; color?: string }>(req);
  if (isResponse(body)) return body;

  const fields: { displayName?: string; color?: string } = {};
  if (typeof body.displayName === "string" && body.displayName.trim())
    fields.displayName = body.displayName.trim();
  if (typeof body.color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.color))
    fields.color = body.color;
  if (Object.keys(fields).length === 0) {
    return jsonError("inget att uppdatera", 400);
  }
  const rec = await getUserRepository().update(session.userId, fields);
  return NextResponse.json({
    user: { displayName: rec.displayName, color: rec.color },
  });
}

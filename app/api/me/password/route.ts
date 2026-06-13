export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getUserRepository } from "@/lib/db/repository";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import {
  requireSession,
  readJson,
  isResponse,
  jsonError,
} from "@/lib/api/http";

// A logged-in user changes their own password (must prove the current one).
export async function POST(req: Request) {
  const session = await requireSession();
  if (isResponse(session)) return session;

  const body = await readJson<{
    currentPassword?: string;
    newPassword?: string;
  }>(req);
  if (isResponse(body)) return body;

  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  if (newPassword.length < 4) {
    return jsonError("Nytt lösenord måste vara minst 4 tecken", 400);
  }

  const repo = getUserRepository();
  const rec = await repo.findById(session.userId);
  if (!rec) return jsonError("not found", 404);
  if (!(await verifyPassword(currentPassword, rec.passwordHash))) {
    return jsonError("Fel nuvarande lösenord", 403);
  }

  await repo.update(session.userId, {
    passwordHash: await hashPassword(newPassword),
  });
  return NextResponse.json({ ok: true });
}

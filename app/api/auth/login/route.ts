export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getUserRepository } from "@/lib/db/repository";
import { authenticate } from "@/lib/auth/loginService";
import { createSessionToken } from "@/lib/auth/session";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookies";
import { readJson, isResponse, jsonError, unauthorized } from "@/lib/api/http";

export async function POST(req: Request) {
  const body = await readJson<{ username?: string; password?: string }>(req);
  if (isResponse(body)) return body;

  const { username, password } = body;
  if (!username || !password) {
    return jsonError("missing credentials", 400);
  }
  const session = await authenticate(getUserRepository(), username, password);
  if (!session) {
    return unauthorized("fel användarnamn eller lösenord");
  }
  const token = await createSessionToken(session);
  const res = NextResponse.json({
    user: { username: session.username, isAdmin: session.isAdmin },
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}

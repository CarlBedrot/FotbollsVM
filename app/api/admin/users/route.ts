export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getUserRepository,
  getPredictionRepository,
} from "@/lib/db/repository";
import { hashPassword } from "@/lib/auth/password";
import {
  requireAdminSession,
  readJson,
  isResponse,
  jsonError,
} from "@/lib/api/http";

export async function GET() {
  const guard = await requireAdminSession();
  if (isResponse(guard)) return guard;

  const [users, preds] = await Promise.all([
    getUserRepository().list(),
    getPredictionRepository().all(),
  ]);
  const byUser = new Map(preds.map((p) => [p.userId, p]));
  return NextResponse.json({
    users: users.map((u) => {
      const p = byUser.get(u.id);
      const matchCount = p ? Object.keys(p.matchPicks).length : 0;
      const bonusCount = p ? Object.keys(p.bonus).length : 0;
      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        isAdmin: u.isAdmin,
        color: u.color,
        avatarUrl: u.avatarUrl,
        hasPrediction: matchCount > 0 || bonusCount > 0,
        matchCount,
        bonusCount,
      };
    }),
  });
}

export async function POST(req: Request) {
  const guard = await requireAdminSession();
  if (isResponse(guard)) return guard;

  const body = await readJson<{
    username?: string;
    displayName?: string;
    password?: string;
    color?: string;
    isAdmin?: boolean;
  }>(req);
  if (isResponse(body)) return body;

  const { username, displayName, password, color, isAdmin } = body;
  if (!username || !displayName || !password || !color) {
    return jsonError("missing fields", 400);
  }
  const repo = getUserRepository();
  if (await repo.findByUsername(username)) {
    return jsonError("username exists", 409);
  }
  const user = await repo.create({
    username,
    displayName,
    passwordHash: await hashPassword(password),
    isAdmin: Boolean(isAdmin),
    color,
  });
  return NextResponse.json(
    {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
        color: user.color,
      },
    },
    { status: 201 },
  );
}

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth/cookies';
import { verifySessionToken } from '@/lib/auth/session';
import { getUserRepository, getPredictionRepository } from '@/lib/db/repository';
import { hashPassword } from '@/lib/auth/password';

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  return session?.isAdmin ? session : null;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
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
        id: u.id, username: u.username, displayName: u.displayName,
        isAdmin: u.isAdmin, color: u.color, avatarUrl: u.avatarUrl,
        hasPrediction: matchCount > 0 || bonusCount > 0,
        matchCount, bonusCount,
      };
    }),
  });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  let body: {
    username?: string; displayName?: string; password?: string; color?: string; isAdmin?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const { username, displayName, password, color, isAdmin } = body;
  if (!username || !displayName || !password || !color) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }
  const repo = getUserRepository();
  if (await repo.findByUsername(username)) {
    return NextResponse.json({ error: 'username exists' }, { status: 409 });
  }
  const user = await repo.create({
    username, displayName, passwordHash: await hashPassword(password),
    isAdmin: Boolean(isAdmin), color,
  });
  return NextResponse.json(
    { user: { id: user.id, username: user.username, displayName: user.displayName, isAdmin: user.isAdmin, color: user.color } },
    { status: 201 },
  );
}

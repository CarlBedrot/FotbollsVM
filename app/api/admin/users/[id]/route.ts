export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth/cookies';
import { verifySessionToken } from '@/lib/auth/session';
import { getUserRepository } from '@/lib/db/repository';
import { hashPassword } from '@/lib/auth/password';
import type { UserRecord } from '@/lib/db/userRepository';

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  return session?.isAdmin ? session : null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  let body: { displayName?: string; color?: string; isAdmin?: boolean; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const fields: Partial<Pick<UserRecord, 'displayName' | 'color' | 'isAdmin' | 'passwordHash'>> = {};
  if (body.displayName !== undefined) fields.displayName = body.displayName;
  if (body.color !== undefined) fields.color = body.color;
  if (body.isAdmin !== undefined) fields.isAdmin = Boolean(body.isAdmin);
  if (body.password) fields.passwordHash = await hashPassword(body.password);
  const user = await getUserRepository().update(id, fields);
  return NextResponse.json({
    user: { id: user.id, username: user.username, displayName: user.displayName, isAdmin: user.isAdmin, color: user.color, avatarUrl: user.avatarUrl },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  await getUserRepository().remove(id);
  return NextResponse.json({ ok: true });
}

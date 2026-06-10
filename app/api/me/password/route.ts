export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/currentUser';
import { getUserRepository } from '@/lib/db/repository';
import { verifyPassword, hashPassword } from '@/lib/auth/password';

// A logged-in user changes their own password (must prove the current one).
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const currentPassword = String(body.currentPassword ?? '');
  const newPassword = String(body.newPassword ?? '');
  if (newPassword.length < 4) {
    return NextResponse.json({ error: 'Nytt lösenord måste vara minst 4 tecken' }, { status: 400 });
  }

  const repo = getUserRepository();
  const rec = await repo.findById(u.userId);
  if (!rec) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!(await verifyPassword(currentPassword, rec.passwordHash))) {
    return NextResponse.json({ error: 'Fel nuvarande lösenord' }, { status: 403 });
  }

  await repo.update(u.userId, { passwordHash: await hashPassword(newPassword) });
  return NextResponse.json({ ok: true });
}

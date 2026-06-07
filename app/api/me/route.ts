export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/currentUser';
import { getUserRepository } from '@/lib/db/repository';

export async function GET() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const rec = await getUserRepository().findById(u.userId);
  if (!rec) return NextResponse.json({ error: 'not found' }, { status: 404 });
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
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: { displayName?: string; color?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const fields: { displayName?: string; color?: string } = {};
  if (typeof body.displayName === 'string' && body.displayName.trim()) fields.displayName = body.displayName.trim();
  if (typeof body.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(body.color)) fields.color = body.color;
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'inget att uppdatera' }, { status: 400 });
  }
  const rec = await getUserRepository().update(u.userId, fields);
  return NextResponse.json({ user: { displayName: rec.displayName, color: rec.color } });
}

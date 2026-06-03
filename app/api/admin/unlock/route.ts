export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getPredictionRepository } from '@/lib/db/repository';

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  let body: { userId?: string; unlocked?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!body.userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
  await getPredictionRepository().setUnlock(body.userId, body.unlocked ?? true);
  return NextResponse.json({ ok: true });
}

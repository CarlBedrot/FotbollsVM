export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { parseBuffer } from '@/lib/excel/parse';
import { loadFixtures } from '@/lib/fixtures/load';
import { currentUser } from '@/lib/auth/currentUser';
import { getPredictionRepository } from '@/lib/db/repository';
import { isLocked } from '@/lib/tips/lock';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const repo = getPredictionRepository();
  const [prediction, status] = await Promise.all([repo.get(user.userId), repo.getStatus(user.userId)]);
  return NextResponse.json({ prediction, status });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const fixtures = loadFixtures();
  const repo = getPredictionRepository();
  const status = await repo.getStatus(user.userId);
  if (isLocked(fixtures.firstKickoff, new Date(), status)) {
    return NextResponse.json({ error: 'Tipsen är låsta (matcherna har börjat).' }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'ingen fil' }, { status: 400 });
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseBuffer(buffer, fixtures);

  await repo.save(
    { userId: user.userId, matchPicks: parsed.matchPicks, bonus: parsed.bonus },
    new Date().toISOString(),
  );
  return NextResponse.json({ ok: true, saved: { matches: Object.keys(parsed.matchPicks).length, bonus: Object.keys(parsed.bonus).length }, warnings: parsed.warnings });
}

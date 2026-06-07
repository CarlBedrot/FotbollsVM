export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { parseBuffer } from '@/lib/excel/parse';
import { loadFixtures } from '@/lib/fixtures/load';
import { getPredictionRepository } from '@/lib/db/repository';
import { isLocked } from '@/lib/tips/lock';

// Admin uploads a corrected tipslapp on behalf of a player.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;

  const fixtures = loadFixtures();
  const repo = getPredictionRepository();
  const status = await repo.getStatus(id);
  if (isLocked(fixtures.firstKickoff, new Date(), status)) {
    return NextResponse.json(
      { error: 'Tipsen är låsta (matcherna har börjat). Lås upp spelaren först om du måste ändra.' },
      { status: 403 },
    );
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'ingen fil' }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseBuffer(buffer, fixtures);
  } catch {
    return NextResponse.json(
      { error: 'Kunde inte läsa filen — är det en ifylld .xlsx-tipslapp?' },
      { status: 400 },
    );
  }

  await repo.save(
    { userId: id, matchPicks: parsed.matchPicks, bonus: parsed.bonus },
    new Date().toISOString(),
  );
  return NextResponse.json({
    ok: true,
    name: parsed.name,
    saved: { matches: Object.keys(parsed.matchPicks).length, bonus: Object.keys(parsed.bonus).length },
    warnings: parsed.warnings,
  });
}

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { parseBuffer } from '@/lib/excel/parse';
import { loadFixtures } from '@/lib/fixtures/load';
import { currentUser } from '@/lib/auth/currentUser';

export async function POST(req: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'ingen fil' }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseBuffer(buffer, loadFixtures());
  return NextResponse.json({ parsed });
}

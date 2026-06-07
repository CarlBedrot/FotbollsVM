export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getUserRepository } from '@/lib/db/repository';
import { extFromContentType, uploadAvatar } from '@/lib/storage/avatars';

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'ingen fil' }, { status: 400 });
  }

  const ext = extFromContentType(file.type);
  if (!file.type.startsWith('image/') || !ext) {
    return NextResponse.json({ error: 'filen måste vara en bild (png, jpg, webp)' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'bilden får vara högst 3 MB' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const avatarUrl = await uploadAvatar(id, { buffer, contentType: file.type, ext });
  await getUserRepository().update(id, { avatarUrl });

  return NextResponse.json({ avatarUrl });
}

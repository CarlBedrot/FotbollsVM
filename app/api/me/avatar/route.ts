export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/currentUser';
import { getUserRepository } from '@/lib/db/repository';
import { uploadAvatar, extFromContentType } from '@/lib/storage/avatars';

// A logged-in user uploads their OWN profile photo.
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'ingen fil' }, { status: 400 });
  if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: 'Bilden får vara max 3 MB' }, { status: 400 });
  const ext = extFromContentType(file.type);
  if (!ext) return NextResponse.json({ error: 'Bildformat stöds ej (png, jpg eller webp)' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const avatarUrl = await uploadAvatar(u.userId, { buffer, contentType: file.type, ext });
  await getUserRepository().update(u.userId, { avatarUrl });
  return NextResponse.json({ avatarUrl });
}

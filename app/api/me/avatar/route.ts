export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getUserRepository } from "@/lib/db/repository";
import { uploadAvatar, extFromContentType } from "@/lib/storage/avatars";
import { requireSession, isResponse, badRequest } from "@/lib/api/http";

// A logged-in user uploads their OWN profile photo.
export async function POST(req: Request) {
  const session = await requireSession();
  if (isResponse(session)) return session;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) return badRequest("ingen fil");
  if (file.size > 3 * 1024 * 1024)
    return badRequest("Bilden får vara max 3 MB");
  const ext = extFromContentType(file.type);
  if (!ext) return badRequest("Bildformat stöds ej (png, jpg eller webp)");

  const buffer = Buffer.from(await file.arrayBuffer());
  const avatarUrl = await uploadAvatar(session.userId, {
    buffer,
    contentType: file.type,
    ext,
  });
  await getUserRepository().update(session.userId, { avatarUrl });
  return NextResponse.json({ avatarUrl });
}

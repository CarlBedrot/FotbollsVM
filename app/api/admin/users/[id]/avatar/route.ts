export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getUserRepository } from "@/lib/db/repository";
import { extFromContentType, uploadAvatar } from "@/lib/storage/avatars";
import { requireAdminSession, isResponse, badRequest } from "@/lib/api/http";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminSession();
  if (isResponse(guard)) return guard;

  const { id } = await params;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return badRequest();
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return badRequest("ingen fil");
  }

  const ext = extFromContentType(file.type);
  if (!file.type.startsWith("image/") || !ext) {
    return badRequest("filen måste vara en bild (png, jpg, webp)");
  }
  if (file.size > MAX_BYTES) {
    return badRequest("bilden får vara högst 3 MB");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const avatarUrl = await uploadAvatar(id, {
    buffer,
    contentType: file.type,
    ext,
  });
  await getUserRepository().update(id, { avatarUrl });

  return NextResponse.json({ avatarUrl });
}

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getUserRepository } from "@/lib/db/repository";
import { hashPassword } from "@/lib/auth/password";
import type { UserRecord } from "@/lib/db/userRepository";
import { requireAdminSession, readJson, isResponse } from "@/lib/api/http";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminSession();
  if (isResponse(guard)) return guard;

  const { id } = await params;
  const body = await readJson<{
    displayName?: string;
    color?: string;
    isAdmin?: boolean;
    password?: string;
  }>(req);
  if (isResponse(body)) return body;

  const fields: Partial<
    Pick<UserRecord, "displayName" | "color" | "isAdmin" | "passwordHash">
  > = {};
  if (body.displayName !== undefined) fields.displayName = body.displayName;
  if (body.color !== undefined) fields.color = body.color;
  if (body.isAdmin !== undefined) fields.isAdmin = Boolean(body.isAdmin);
  if (body.password) fields.passwordHash = await hashPassword(body.password);
  const user = await getUserRepository().update(id, fields);
  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
      color: user.color,
      avatarUrl: user.avatarUrl,
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminSession();
  if (isResponse(guard)) return guard;

  const { id } = await params;
  await getUserRepository().remove(id);
  return NextResponse.json({ ok: true });
}

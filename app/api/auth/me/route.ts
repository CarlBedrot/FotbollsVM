export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/currentUser";

export async function GET() {
  const session = await currentUser();
  return NextResponse.json({
    user: session
      ? {
          userId: session.userId,
          username: session.username,
          isAdmin: session.isAdmin,
        }
      : null,
  });
}

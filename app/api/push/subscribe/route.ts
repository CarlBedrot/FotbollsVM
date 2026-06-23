export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getPushSubscriptionRepository } from "@/lib/db/repository";
import {
  requireSession,
  readJson,
  isResponse,
  jsonError,
} from "@/lib/api/http";

interface SubscribeBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

/** Store (or refresh) the calling user's device subscription. Idempotent on
 *  endpoint, so re-granting permission on the same device just updates keys. */
export async function POST(req: Request) {
  const session = await requireSession();
  if (isResponse(session)) return session;

  const body = await readJson<SubscribeBody>(req);
  if (isResponse(body)) return body;

  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return jsonError("ofullständig prenumeration", 400);
  }

  await getPushSubscriptionRepository().upsert({
    endpoint,
    userId: session.userId,
    p256dh: keys.p256dh,
    auth: keys.auth,
  });

  return NextResponse.json({ ok: true });
}

/** Remove a device subscription (user toggled notifications off). */
export async function DELETE(req: Request) {
  const session = await requireSession();
  if (isResponse(session)) return session;

  const body = await readJson<{ endpoint?: string }>(req);
  if (isResponse(body)) return body;
  if (!body.endpoint) return jsonError("endpoint saknas", 400);

  await getPushSubscriptionRepository().deleteByEndpoint(body.endpoint);
  return NextResponse.json({ ok: true });
}

import webpush from "web-push";
import type { PushSender } from "./dailyPushService";
import { PushGoneError } from "./dailyPushService";

/** VAPID identity. The public key is also exposed to the browser via
 *  NEXT_PUBLIC_VAPID_PUBLIC_KEY; the private key stays server-only. */
export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

/** Reads VAPID config from the environment, throwing loudly if unset so a
 *  misconfigured deploy fails fast rather than silently sending nothing. */
export function vapidFromEnv(): VapidConfig {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:calletennis@gmail.com";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set");
  }
  return { publicKey, privateKey, subject };
}

/** Builds a `PushSender` backed by the web-push library. 404/410 from the push
 *  service mean the device unsubscribed — surfaced as `PushGoneError` so the
 *  digest service prunes the row. */
export function createWebPushSender(config: VapidConfig): PushSender {
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);

  return async (record, payload) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: record.endpoint,
          keys: { p256dh: record.p256dh, auth: record.auth },
        },
        JSON.stringify(payload),
      );
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410)
        throw new PushGoneError(record.endpoint);
      throw e;
    }
  };
}

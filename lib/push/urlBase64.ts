/** Converts a base64url VAPID key (as shipped in NEXT_PUBLIC_VAPID_PUBLIC_KEY)
 *  into the Uint8Array `pushManager.subscribe` expects as applicationServerKey.
 *  Works in both the browser and Node (atob is available in both modern
 *  runtimes), so the conversion stays unit-testable. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

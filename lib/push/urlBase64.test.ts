import { describe, it, expect } from "vitest";
import { urlBase64ToUint8Array } from "./urlBase64";

describe("urlBase64ToUint8Array", () => {
  it("decodes a standard base64url string to the right bytes", () => {
    // "hello" in base64url is "aGVsbG8"
    const bytes = urlBase64ToUint8Array("aGVsbG8");
    expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111]);
  });

  it("handles url-safe characters (- and _) and missing padding", () => {
    // 0xfb 0xff 0xbf encodes to "-_-_" in standard base64, "-_-_" url-safe
    const bytes = urlBase64ToUint8Array("-_-_");
    expect(Array.from(bytes)).toEqual([251, 255, 191]);
  });

  it("decodes a realistic 65-byte VAPID applicationServerKey", () => {
    const key =
      "BLxOw-IUk_IgvlMHhtsuVGT_OXcSMQmvoPEwVHhq9l757yK9U3DjC4K2pieCv43wvKxsB5Ca0E2MJfLd8YJSvjs";
    const bytes = urlBase64ToUint8Array(key);
    // Uncompressed P-256 public keys are 65 bytes and start with 0x04.
    expect(bytes).toHaveLength(65);
    expect(bytes[0]).toBe(0x04);
  });
});

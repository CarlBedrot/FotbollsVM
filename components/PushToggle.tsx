"use client";
import { useEffect, useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/push/urlBase64";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type Status =
  | "loading"
  | "unsupported"
  | "needs-install"
  | "off"
  | "on"
  | "blocked";

/** True for an iOS device that is *not* running as an installed PWA — Safari
 *  only allows web push from the home-screen app, so we steer the user there. */
function isIosBrowserTab(): boolean {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    if (!supported) {
      setStatus(isIosBrowserTab() ? "needs-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("blocked");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, []);

  async function enable() {
    setBusy(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("kunde inte spara prenumerationen");
      setStatus("on");
    } catch {
      setError("Kunde inte slå på notiser. Försök igen.");
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("Kunde inte stänga av notiser.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading")
    return (
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        Laddar…
      </p>
    );

  if (status === "needs-install")
    return (
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        Lägg först till VM-tipset på hemskärmen (Dela → Lägg till på
        hemskärmen), öppna appen därifrån och slå sedan på notiser här.
      </p>
    );

  if (status === "unsupported")
    return (
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        Din webbläsare stöder inte pushnotiser.
      </p>
    );

  if (status === "blocked")
    return (
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        Notiser är blockerade. Tillåt dem för VM-tipset i systeminställningarna
        och försök igen.
      </p>
    );

  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        Få en pushnotis varje morgon kl 08 när ställningen ändrats över natten.
      </p>
      {status === "on" ? (
        <button type="button" className="btn" disabled={busy} onClick={disable}>
          {busy ? "Stänger av…" : "Stäng av notiser"}
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-accent"
          disabled={busy}
          onClick={enable}
        >
          {busy ? "Slår på…" : "Slå på morgonnotiser"}
        </button>
      )}
      {error && (
        <p style={{ margin: 0, fontWeight: 700, color: "var(--red)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";

export interface NavUser {
  displayName: string;
  color: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

// Primärnavigeringen bor i bottenraden (BottomNav). Toppraden håller bara
// varumärket och det sekundära under avataren.
const MENU = [
  { href: "/profil", label: "Min profil" },
  { href: "/installningar", label: "Inställningar" },
];

/** Topprad: varumärke + avatar-meny. user kommer från sessionen i
 *  serverlayouten (ingen klient-fetch); null = utloggad, då visas bara
 *  varumärket. */
export function Nav({ user }: { user: NavUser | null }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function logout() {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  return (
    <div className="top">
      <Link href="/" className="brand">
        <span className="mark">VM</span>
        <span>
          <h1>
            VM-tipset <span>2026</span>
          </h1>
        </span>
      </Link>
      {user && (
        <div className="menu-wrap" ref={ref}>
          <button
            className="avatar-btn"
            aria-label="Meny"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <Avatar
              name={user.displayName}
              color={user.color}
              avatarUrl={user.avatarUrl}
              size={40}
            />
          </button>
          {open && (
            <nav className="menu">
              {MENU.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className={path.startsWith(t.href) ? "active" : ""}
                  onClick={() => setOpen(false)}
                >
                  {t.label}
                </Link>
              ))}
              {user.isAdmin && (
                <Link
                  href="/admin"
                  className={path.startsWith("/admin") ? "active" : ""}
                  onClick={() => setOpen(false)}
                >
                  Admin
                </Link>
              )}
              <button type="button" className="menu-logout" onClick={logout}>
                Logga ut
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}

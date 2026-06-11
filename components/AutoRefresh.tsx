'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_INTERVAL_MS = 60_000;

/** Re-fetches server data when the (installed) app returns to the foreground,
 *  and on a slow interval while it stays visible — so standings and results
 *  never sit stale in a resumed PWA. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      clearInterval(timer);
    };
  }, [router]);
  return null;
}

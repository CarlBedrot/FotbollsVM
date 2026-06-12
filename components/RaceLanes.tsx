'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { Avatar } from './Avatar';
import { railFraction } from '@/lib/view/barometer';
import type { StandingView } from '@/lib/view/standingsView';

/**
 * Mobilvyn av Loppet: en horisontell bana per spelare. Brickan springer från
 * startlinjen vänster mot mållinjen (168 p) till höger. På desktop används
 * istället taktiktavlan (RaceTrack) — den blir för trång på smal skärm.
 */
export function RaceLanes({ standings }: { standings: StandingView[] }) {
  // Samma trick som RaceTrack: brickorna startar vid 0 och transitionar fram
  // till sin riktiga position när `ready` flippar, så loppet "springer igång".
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setReady(true);
      return;
    }
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="lanes">
      {standings.map((s) => {
        const frac = ready ? railFraction(s.totalPoints) : 0;
        const lead = s.rank === 1;
        return (
          <div key={s.userId} className={`lane${lead ? ' lead' : ''}`}>
            <div className="lane-name">{s.displayName}</div>
            <div className="lane-rail">
              <div className="lane-runner" style={{ '--pct': frac } as CSSProperties}>
                <Avatar name={s.displayName} color={s.color} avatarUrl={s.avatarUrl} size={30} lead={lead} className="disc" />
              </div>
            </div>
            <div className="lane-pts"><b>{s.totalPoints}</b></div>
          </div>
        );
      })}
    </div>
  );
}

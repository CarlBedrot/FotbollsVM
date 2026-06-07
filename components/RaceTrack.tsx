'use client';
import { useEffect, useState } from 'react';
import { Avatar } from './Avatar';
import { railFraction, runnerLeft } from '@/lib/view/barometer';
import type { StandingView } from '@/lib/view/standingsView';

export function RaceTrack({ standings }: { standings: StandingView[] }) {
  // On first mount every runner sits at the start gate (frac 0); once `ready`
  // flips to true the real fracs are applied and the CSS transition glides
  // each horse out to its position.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setReady(true);
      return;
    }
    // Defer to the next frame so the browser paints the start positions first,
    // otherwise there is nothing to transition from.
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      {standings.map((s) => {
        const frac = ready ? railFraction(s.totalPoints) : 0;
        return (
          <div key={s.userId} className="lane">
            <div className="laneName">
              <span className="rank-badge">{s.rank}</span>
              {s.displayName}
            </div>
            <div className="rail" />
            <div className="runner" style={{ left: runnerLeft(frac) }}>
              <Avatar name={s.displayName} color={s.color} avatarUrl={s.avatarUrl} size={34} lead={s.rank === 1} />
              <span className="pts">{s.totalPoints}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}

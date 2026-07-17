'use client';
import { useEffect, useState } from 'react';
import { ClickableAvatar } from './ClickableAvatar';
import { railFraction, magnetTopPercent, magnetLeftPercent } from '@/lib/view/barometer';
import { MAX_POINTS } from '@/lib/domain/rules';
import type { StandingView } from '@/lib/view/standingsView';

export function RaceTrack({ standings }: { standings: StandingView[] }) {
  // On first mount every magnet sits in the own half (frac 0); once `ready`
  // flips to true the real fracs are applied and the CSS transition pushes
  // each player up the pitch towards the goal.
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
    <div className="pitch">
      <span className="goal-note">Mål = {MAX_POINTS} p</span>
      {standings.map((s, i) => {
        const frac = ready ? railFraction(s.totalPoints) : 0;
        const lead = s.rank === 1;
        return (
          <div
            key={s.userId}
            className={`magnet${lead ? ' lead' : ''}`}
            style={{ top: `${magnetTopPercent(frac)}%`, left: `${magnetLeftPercent(i)}%` }}
          >
            <ClickableAvatar userId={s.userId} name={s.displayName} color={s.color} avatarUrl={s.avatarUrl} size={42} lead={lead} className="disc" />
            <span className="tag"><b>{s.totalPoints}</b> {s.displayName}</span>
          </div>
        );
      })}
    </div>
  );
}

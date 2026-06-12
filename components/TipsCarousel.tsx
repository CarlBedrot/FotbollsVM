'use client';
import { useRef, useState } from 'react';
import { Avatar } from './Avatar';
import { PlayerSheet } from './PlayerSheet';
import { CompareView } from './CompareView';
import type { AllTips, PlayerTips } from '@/lib/view/allTips';

export function TipsCarousel({ data }: { data: AllTips }) {
  const players = data.players;
  const me = players.find((p) => p.userId === data.meId) ?? null;
  const [active, setActive] = useState(0);
  const [compareWith, setCompareWith] = useState<PlayerTips | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  function goTo(i: number) {
    const slide = scrollerRef.current?.children[i] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    setActive(i);
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    const clamped = Math.max(0, Math.min(i, players.length - 1));
    if (clamped !== active) setActive(clamped);
  }

  if (compareWith && me) {
    return <CompareView me={me} other={compareWith} outcomes={data.outcomes} onClose={() => setCompareWith(null)} />;
  }

  const activePlayer = players[active];
  const viewingOther = activePlayer && activePlayer.userId !== data.meId;

  return (
    <div className="stack">
      <div className="tc-tabs" role="tablist" aria-label="Spelare">
        {players.map((p, i) => (
          <button
            key={p.userId}
            className={`tc-tab${i === active ? ' on' : ''}`}
            onClick={() => goTo(i)}
            role="tab"
            aria-selected={i === active}
          >
            <Avatar name={p.displayName} color={p.color} avatarUrl={p.avatarUrl} size={32} />
            <span>{p.displayName}{p.userId === data.meId ? ' (du)' : ''}</span>
          </button>
        ))}
      </div>

      {me && viewingOther && (
        <button className="btn btn-accent tc-compare" onClick={() => setCompareWith(activePlayer)}>
          Jämför dig med {activePlayer.displayName}
        </button>
      )}

      <div className="tc-scroller" ref={scrollerRef} onScroll={onScroll}>
        {players.map((p) => (
          <div className="tc-slide" key={p.userId}>
            <PlayerSheet player={p} outcomes={data.outcomes} me={p.userId === data.meId ? null : me} />
          </div>
        ))}
      </div>

      <p className="cap tc-hint">Swajpa i sidled eller tryck på en spelare för att se andras tips.</p>
    </div>
  );
}

'use client';
import { type CSSProperties } from 'react';
import type { StandingView } from '@/lib/view/standingsView';

interface Props {
  players: StandingView[];
  highlighted: Set<string>;
  onToggle: (userId: string) => void;
  onReset: () => void;
}

export function PlayerLegend({ players, highlighted, onToggle, onReset }: Props) {
  return (
    <div className="legend">
      <div className="legend-head">
        <span className="legend-title">Spelare</span>
        <button type="button" className={`legend-all${highlighted.size === 0 ? ' on' : ''}`} onClick={onReset}>
          Alla
        </button>
      </div>
      <div className="legend-grid">
        {players.map((p) => {
          const on = highlighted.has(p.userId);
          return (
            <button
              key={p.userId}
              type="button"
              className={`legend-chip${on ? ' on' : ''}`}
              aria-pressed={on}
              onClick={() => onToggle(p.userId)}
            >
              <span className="dot" style={{ background: p.color } as CSSProperties} />
              <span className="nm">{p.displayName}</span>
              <span className="pts">{p.totalPoints} poäng</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import type { PointsTimeline } from '@/lib/view/pointsTimeline';
import type { StandingView } from '@/lib/view/standingsView';
import { PointsChart } from './PointsChart';
import { PlayerLegend } from './PlayerLegend';

interface Props {
  timeline: PointsTimeline;
  players: StandingView[];
}

export function UtvecklingView({ timeline, players }: Props) {
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  const toggle = (userId: string) =>
    setHighlighted((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  return (
    <div className="stack">
      <PointsChart steps={timeline.steps} series={timeline.series} players={players} highlighted={highlighted} />
      <PlayerLegend
        players={players}
        highlighted={highlighted}
        onToggle={toggle}
        onReset={() => setHighlighted(new Set())}
      />
    </div>
  );
}

'use client';
import { useState, type CSSProperties } from 'react';
import type { PlayerSeries, TimelineStep } from '@/lib/view/pointsTimeline';
import type { StandingView } from '@/lib/view/standingsView';
import { linearScale, buildLinePath } from '@/lib/view/chartScale';

const W = 820;
const H = 420;
const PAD = { l: 40, r: 96, t: 16, b: 34 };
const innerW = W - PAD.l - PAD.r;
const innerH = H - PAD.t - PAD.b;

interface Props {
  steps: TimelineStep[];
  series: PlayerSeries[];
  players: StandingView[];
  highlighted: Set<string>;
}

export function PointsChart({ steps, series, players, highlighted }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const K = steps.length;
  const colorByUser = new Map(players.map((p) => [p.userId, p.color]));
  const nameByUser = new Map(players.map((p) => [p.userId, p.displayName]));

  const maxRaw = Math.max(1, ...series.flatMap((s) => s.points));
  const maxY = Math.max(4, Math.ceil(maxRaw / 4) * 4);

  const x = linearScale([0, Math.max(1, K)], [PAD.l, PAD.l + innerW]);
  const y = linearScale([0, maxY], [PAD.t + innerH, PAD.t]);

  const yTicks = [0, 1, 2, 3, 4].map((i) => (maxY / 4) * i);
  const xEvery = K <= 14 ? 1 : Math.ceil(K / 12);

  // Players sorted by their final value, so highlighted/leading lines paint last (on top).
  const ordered = [...series].sort((a, b) => {
    const av = a.points[a.points.length - 1] ?? 0;
    const bv = b.points[b.points.length - 1] ?? 0;
    return av - bv;
  });

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((px - PAD.l) / innerW) * K);
    setHover(Math.max(0, Math.min(K, idx)));
  };

  const tooltipRows =
    hover === null
      ? []
      : ordered
          .map((s) => ({
            userId: s.userId,
            name: nameByUser.get(s.userId) ?? s.userId,
            color: colorByUser.get(s.userId) ?? '#888',
            value: s.points[hover] ?? 0,
          }))
          .sort((a, b) => b.value - a.value);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Poäng per match">
        {/* Y grid + labels */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} y1={y(t)} x2={PAD.l + innerW} y2={y(t)} className="chart-grid" />
            <text x={PAD.l - 8} y={y(t) + 4} className="chart-axis" textAnchor="end">{t}</text>
          </g>
        ))}
        {/* X labels */}
        {steps
          .filter((_, i) => i % xEvery === 0)
          .map((s) => (
            <text key={s.matchId} x={x(s.index)} y={PAD.t + innerH + 20} className="chart-axis" textAnchor="middle">
              {s.index}
            </text>
          ))}
        <text x={PAD.l + innerW / 2} y={H - 2} className="chart-axis-title" textAnchor="middle">Match</text>

        {/* Hover guide */}
        {hover !== null && hover > 0 && (
          <line x1={x(hover)} y1={PAD.t} x2={x(hover)} y2={PAD.t + innerH} className="chart-cursor" />
        )}

        {/* Lines */}
        {ordered.map((s) => {
          const color = colorByUser.get(s.userId) ?? '#888';
          const dim = highlighted.size > 0 && !highlighted.has(s.userId);
          const lead = highlighted.has(s.userId);
          const pts = s.points.map((v, i) => ({ x: x(i), y: y(v) }));
          const last = pts[pts.length - 1];
          const showName = highlighted.size === 0 || lead;
          return (
            <g key={s.userId} style={{ opacity: dim ? 0.16 : 1 } as CSSProperties}>
              <path d={buildLinePath(pts)} fill="none" stroke={color} strokeWidth={lead ? 3.2 : 1.8}
                strokeLinejoin="round" strokeLinecap="round" />
              {hover !== null && (
                <circle cx={x(hover)} cy={y(s.points[hover] ?? 0)} r={lead ? 4 : 3} fill={color} />
              )}
              {showName && last && (
                <text x={last.x + 6} y={last.y + 4} className="chart-endlabel" fill={color}>
                  {nameByUser.get(s.userId) ?? s.userId}
                </text>
              )}
            </g>
          );
        })}

        {/* Mouse capture */}
        <rect x={PAD.l} y={PAD.t} width={innerW} height={innerH} fill="transparent"
          onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>

      {hover !== null && hover > 0 && tooltipRows.length > 0 && (
        <div className="chart-tooltip" style={{ left: `${(x(hover) / W) * 100}%` } as CSSProperties}>
          <div className="chart-tooltip-head">{steps[hover - 1]?.label}</div>
          {tooltipRows.map((row) => (
            <div key={row.userId} className="chart-tooltip-row">
              <span className="dot" style={{ background: row.color } as CSSProperties} />
              <span className="nm">{row.name}</span>
              <b>{row.value}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

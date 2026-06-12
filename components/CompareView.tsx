'use client';
import { useMemo, useState } from 'react';
import { Avatar } from './Avatar';
import { Flag } from './Flag';
import type { PlayerTips } from '@/lib/view/allTips';
import type { MyTips } from '@/lib/view/myTips';
import type { Pick } from '@/lib/domain/types';
import { compareMatches, summarize, verdict } from '@/lib/view/tipsCompare';

function shortDate(iso: string) {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)}/${Number(m)}`;
}

function bonusRows(me: MyTips, other: MyTips) {
  const rows: Array<{ label: string; mine: string | null; theirs: string | null }> = [
    { label: 'VM-vinnare', mine: me.champion, theirs: other.champion },
    { label: 'Finalist 1', mine: me.finalist1, theirs: other.finalist1 },
    { label: 'Finalist 2', mine: me.finalist2, theirs: other.finalist2 },
    { label: 'Brons', mine: me.bronze, theirs: other.bronze },
    { label: 'Flest mål', mine: me.mostGoals, theirs: other.mostGoals },
    { label: 'Färst mål', mine: me.fewestGoals, theirs: other.fewestGoals },
  ];
  return rows;
}

function Chip({ pick, outcome }: { pick: Pick | null; outcome: Pick | undefined }) {
  const v = verdict(pick, outcome);
  return <span className={`pick-chip v-${v}${pick ? '' : ' missing'}`}>{pick ?? '?'}</span>;
}

export function CompareView({
  me,
  other,
  outcomes,
  onClose,
}: {
  me: PlayerTips;
  other: PlayerTips;
  outcomes: Record<string, Pick>;
  onClose: () => void;
}) {
  const [onlyDiff, setOnlyDiff] = useState(false);
  const rows = useMemo(() => compareMatches(me.tips, other.tips, outcomes), [me, other, outcomes]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const shown = onlyDiff ? rows.filter((r) => !r.same) : rows;
  const bonus = bonusRows(me.tips, other.tips);

  return (
    <div className="stack">
      <div className="card sec">
        <div className="cmp-bar">
          <button className="btn" onClick={onClose}>← Tillbaka</button>
          <button className={`btn${onlyDiff ? ' btn-accent' : ''}`} onClick={() => setOnlyDiff((v) => !v)}>
            {onlyDiff ? 'Visar bara skillnader' : 'Bara skillnader'}
          </button>
        </div>

        <div className="cmp-heads">
          <div className="cmp-who">
            <Avatar name={me.displayName} color={me.color} avatarUrl={me.avatarUrl} size={40} />
            <span>{me.displayName} (du)</span>
          </div>
          <div className="cmp-tally"><b>{summary.same}</b> lika · <b>{summary.diff}</b> olika</div>
          <div className="cmp-who right">
            <span>{other.displayName}</span>
            <Avatar name={other.displayName} color={other.color} avatarUrl={other.avatarUrl} size={40} />
          </div>
        </div>
      </div>

      <div className="card sec">
        <div className="cap" style={{ marginBottom: 6 }}>Matchtips</div>
        {shown.length === 0 && <p className="empty">Inga skillnader — ni har tippat exakt lika.</p>}
        {shown.map((r) => (
          <div key={r.id} className={`cmp-row${r.same ? '' : ' diff'}`}>
            <Chip pick={r.mine} outcome={r.outcome} />
            <div className="cmp-match">
              <span className="mt-date">{shortDate(r.kickoff)}</span>
              <Flag team={r.homeLabel} /> {r.homeLabel} – {r.awayLabel} <Flag team={r.awayLabel} />
            </div>
            <Chip pick={r.theirs} outcome={r.outcome} />
          </div>
        ))}
      </div>

      <div className="card sec">
        <div className="cap" style={{ marginBottom: 6 }}>Bonustips</div>
        {bonus.map((b) => {
          const same = b.mine !== null && b.theirs !== null && b.mine === b.theirs;
          return (
            <div key={b.label} className={`cmp-brow${same ? '' : ' diff'}`}>
              <span className="cmp-bteam">{b.mine ? <><Flag team={b.mine} /> {b.mine}</> : '—'}</span>
              <span className="cmp-blabel">{b.label}</span>
              <span className="cmp-bteam right">{b.theirs ? <>{b.theirs} <Flag team={b.theirs} /></> : '—'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

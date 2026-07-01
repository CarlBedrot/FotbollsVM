import { Avatar } from './Avatar';
import type { RemainingRow, RemainingRowCategory } from '@/lib/view/remainingView';

function note(c: RemainingRowCategory): string {
  if (!c.teamName) return 'ingen tippning';
  if (c.decided) return `${c.teamName} · avgjord`;
  if (!c.alive) return `${c.teamName} · utslagen`;
  return `${c.teamName} · lever`;
}

function state(c: RemainingRowCategory): 'live' | 'done' | 'dead' {
  if (c.counts) return 'live';
  if (c.decided) return 'done';
  return 'dead';
}

export function KvarView({ rows }: { rows: RemainingRow[] }) {
  return (
    <div className="kvar-list">
      {rows.map((r) => (
        <details key={r.userId} className="kvar-row">
          <summary className="kvar-head">
            <Avatar name={r.displayName} color={r.color} avatarUrl={r.avatarUrl} size={34} />
            <span className="kvar-name">{r.displayName}</span>
            <span className="kvar-nums">
              <b>{r.possibleTotal}</b>
              <small>{r.currentTotal} nu · +{r.reachable} kvar</small>
            </span>
          </summary>
          <ul className="kvar-cats">
            {r.categories.map((c, i) => (
              <li key={`${c.key}-${i}`} className={`kvar-cat ${state(c)}`}>
                <span className="kvar-cat-label">{c.label}</span>
                <span className="kvar-cat-note">{note(c)}</span>
                <span className="kvar-cat-pts">{c.counts ? `+${c.points}` : '—'}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

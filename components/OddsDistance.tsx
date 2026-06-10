import { Card, SectionHeader } from './Card';
import { Avatar } from './Avatar';
import type { OddsDistanceRow } from '@/lib/view/extraStats';

const pp = (n: number) => n.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function OddsDistance({ rows, hasOdds }: { rows: OddsDistanceRow[]; hasOdds: boolean }) {
  const max = Math.max(...rows.map((r) => r.avgDistancePp), 1);
  return (
    <Card>
      <SectionHeader
        title="Oddsavståndet"
        caption="Snittavstånd från spelbolagens favorit per match — 0 pp = tippar alltid som oddsen"
      />
      {!hasOdds && <p className="empty">Odds saknas — fyll i data/odds.json så vaknar den här tavlan.</p>}
      {hasOdds && rows.length === 0 && <p className="empty">Inga tips att jämföra ännu.</p>}
      {rows.map((r, i) => (
        <div key={r.player.userId} className="dist-row">
          <Avatar name={r.player.name} color={r.player.color} avatarUrl={r.player.avatarUrl} size={28} className="mini" />
          <div className="dist-main">
            <div className="dist-top">
              <span className="nm">{r.player.name}</span>
              {i === 0 && <span className="chalk-note">närmast det väntade</span>}
              {i === rows.length - 1 && rows.length > 1 && <span className="chalk-note pink">vildaste chansaren</span>}
            </div>
            <div className="dist-bar"><i style={{ width: `${Math.max(4, (r.avgDistancePp / max) * 100)}%` }} /></div>
          </div>
          <span className="dist-val">{pp(r.avgDistancePp)} pp</span>
        </div>
      ))}
    </Card>
  );
}

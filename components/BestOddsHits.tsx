import { Card, SectionHeader } from './Card';
import { Avatar } from './Avatar';
import { Flag } from './Flag';
import type { OddsHit } from '@/lib/view/extraStats';

const fmtOdds = (n: number) => n.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PICK_LABEL: Record<string, string> = { '1': 'hemmaseger', X: 'kryss', '2': 'bortaseger' };

export function BestOddsHits({ hits, hasOdds }: { hits: OddsHit[]; hasOdds: boolean }) {
  return (
    <Card>
      <SectionHeader title="Turneringens skräll" caption="Vem har prickat utfallet med högst odds? Uppdateras löpande" />
      {!hasOdds && <p className="empty">Odds saknas — fyll i data/odds.json så vaknar den här tavlan.</p>}
      {hasOdds && hits.length === 0 && <p className="empty">Inga rätt tips ännu — skrällarna kommer.</p>}
      {hits.map((h, i) => (
        <div key={h.player.userId} className={`hit-row${i === 0 ? ' best' : ''}`}>
          <Avatar name={h.player.name} color={h.player.color} avatarUrl={h.player.avatarUrl} size={28} className="mini" />
          <div className="hit-main">
            <span className="nm">{h.player.name}</span>
            <span className="hit-match">
              <Flag team={h.homeLabel} /> {h.homeLabel} – {h.awayLabel} <Flag team={h.awayLabel} />
              <em> · {PICK_LABEL[h.pick]}</em>
            </span>
          </div>
          <span className="hit-odds">{fmtOdds(h.odds)}</span>
        </div>
      ))}
    </Card>
  );
}

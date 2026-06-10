import { Card, SectionHeader } from './Card';
import type { PickSplit as PickSplitData } from '@/lib/view/extraStats';

function Bar({ counts, total }: { counts: Record<'1' | 'X' | '2', number>; total: number }) {
  if (total === 0) return null;
  const w = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="split-bar">
      {counts['1'] > 0 && <i className="seg1" style={{ width: w(counts['1']) }} />}
      {counts.X > 0 && <i className="segx" style={{ width: w(counts.X) }} />}
      {counts['2'] > 0 && <i className="seg2" style={{ width: w(counts['2']) }} />}
    </div>
  );
}

export function PickSplit({ split }: { split: PickSplitData }) {
  return (
    <Card>
      <SectionHeader title="Etta, kryss eller tvåa?" caption="Så fördelar sig allas 1/X/2 över gruppspelet" />
      {split.rows.length === 0 && <p className="empty">Inga tips ännu.</p>}
      {split.rows.length > 0 && (
        <div className="split-legend">
          <span><i className="dot seg1" /> 1 hemma</span>
          <span><i className="dot segx" /> X kryss</span>
          <span><i className="dot seg2" /> 2 borta</span>
        </div>
      )}
      {split.rows.map((r) => (
        <div key={r.player.userId} className="split-row">
          <span className="nm">{r.player.name}</span>
          <Bar counts={r.counts} total={r.total} />
          <span className="split-nums">{r.counts['1']} / {r.counts.X} / {r.counts['2']}</span>
        </div>
      ))}
      {split.total.total > 0 && (
        <div className="split-row total">
          <span className="nm">Hela gänget</span>
          <Bar counts={split.total.counts} total={split.total.total} />
          <span className="split-nums">{split.total.counts['1']} / {split.total.counts.X} / {split.total.counts['2']}</span>
        </div>
      )}
    </Card>
  );
}

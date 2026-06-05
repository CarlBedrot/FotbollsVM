import { Card, SectionHeader } from './Card';
import type { Stat } from '@/lib/view/stats';

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <Card>
      <SectionHeader title="Statistik" caption="Kul fakta från ligan" />
      {stats.length === 0 && <p className="empty">Statistik dyker upp när matcherna rullar.</p>}
      {stats.length > 0 && (
        <div className="stats">
          {stats.map((s) => (
            <div key={s.key} className="stat">
              <div className="k">{s.label}</div>
              <div className="v">{s.value}</div>
              <div className="w">{s.who} {s.emoji}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

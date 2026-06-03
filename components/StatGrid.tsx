import { Card, SectionHeader } from './Card';
import type { Stat } from '@/lib/view/stats';

const BG = ['#fff4f4', '#eef3ff', '#eefaf2', '#fff8e8'];

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <Card>
      <SectionHeader pill="Statistik" pillColor="#e23b3b" title="KUL FAKTA" />
      {stats.length === 0 && <p className="font-bold opacity-60">Statistik dyker upp när matcherna rullar.</p>}
      <div className="grid grid-cols-2 max-[480px]:grid-cols-1 gap-3">
        {stats.map((s, i) => (
          <div key={s.key} className="border-[2.5px] border-ink rounded-xl p-3" style={{ background: BG[i % BG.length], boxShadow: '3px 3px 0 #1c1c22' }}>
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-[#8a7d5e]">{s.label}</div>
            <div className="anton text-lg mt-1">{s.value}</div>
            <div className="font-extrabold text-xs mt-0.5">{s.who} {s.emoji}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

import { Avatar } from './Avatar';
import { Card, SectionHeader } from './Card';
import type { StandingView } from '@/lib/view/standingsView';
import { MAX_POINTS } from '@/lib/domain/rules';

const MOVE: Record<string, string> = { up: '▲ upp', down: '▼ ner', same: '— oförändrad', new: '★ ny' };
const MOVE_COLOR: Record<string, string> = { up: '#1b9e5a', down: '#e23b3b', same: '#8a7d5e', new: '#2b5fd0' };

export function Leaderboard({ standings, limit }: { standings: StandingView[]; limit?: number }) {
  const rows = limit ? standings.slice(0, limit) : standings;
  return (
    <Card>
      <SectionHeader pill="Tabell" pillColor="#1b9e5a" title="STÄLLNING" />
      {rows.length === 0 && <p className="font-bold opacity-60">Inga tips ännu.</p>}
      {rows.map((s) => (
        <div key={s.userId} className="grid grid-cols-[30px_38px_1fr_auto] items-center gap-2.5 py-2 border-b-2 border-dashed border-[#e4d6b4] last:border-0">
          <div className="anton text-xl text-center" style={{ color: s.rank === 1 ? '#f5b833' : s.rank === 2 ? '#9aa0ad' : s.rank === 3 ? '#c8772e' : '#1c1c22' }}>{s.rank}</div>
          <Avatar name={s.displayName} color={s.color} avatarUrl={s.avatarUrl} size={34} />
          <div>
            <div className="font-extrabold text-[15px]">{s.displayName}</div>
            <div className="text-[11px] font-semibold" style={{ color: MOVE_COLOR[s.movement] }}>{MOVE[s.movement]}</div>
          </div>
          <div className="anton text-2xl text-right">{s.totalPoints}<span className="block text-[11px] font-bold text-[#8a7d5e] -mt-1">av {MAX_POINTS}</span></div>
        </div>
      ))}
    </Card>
  );
}

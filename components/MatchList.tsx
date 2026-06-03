import { Card, SectionHeader } from './Card';
import type { MatchView } from '@/lib/view/matchView';

function fmtDate(iso: string) {
  return iso.slice(0, 10);
}

export function MatchList({ matches, title = 'MATCHER' }: { matches: MatchView[]; title?: string }) {
  return (
    <Card>
      <SectionHeader pill="Matcher" pillColor="#2b5fd0" title={title} />
      {matches.length === 0 && <p className="font-bold opacity-60">Inga matcher inlästa ännu.</p>}
      {matches.map((m) => (
        <div key={m.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2.5 border-b-2 border-dashed border-[#e4d6b4] last:border-0">
          <div className="font-extrabold text-sm text-right">{m.homeLabel}</div>
          <div className="anton text-lg text-white px-2.5 py-0.5 rounded-lg text-center min-w-[64px]"
               style={{ background: m.status === 'finished' ? '#1c1c22' : m.status === 'live' ? '#e23b3b' : '#8a7d5e' }}>
            {m.status === 'finished' || m.status === 'live' ? `${m.homeScore}–${m.awayScore}` : fmtDate(m.kickoff)}
          </div>
          <div className="font-extrabold text-sm">{m.awayLabel}</div>
        </div>
      ))}
    </Card>
  );
}

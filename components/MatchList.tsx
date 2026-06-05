import { Card, SectionHeader } from './Card';
import type { MatchView } from '@/lib/view/matchView';
import { flagFor } from '@/lib/view/flags';

function shortDate(iso: string) {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)}/${Number(m)}`;
}

export function MatchList({ matches, title = 'Matcher', caption }: { matches: MatchView[]; title?: string; caption?: string }) {
  return (
    <Card>
      <SectionHeader title={title} caption={caption} />
      {matches.length === 0 && <p className="empty">Inga matcher inlästa ännu.</p>}
      {matches.map((m) => {
        const played = m.status === 'finished' || m.status === 'live';
        const hf = flagFor(m.homeLabel);
        const af = flagFor(m.awayLabel);
        return (
          <div key={m.id} className="match">
            <div className="team a">
              {m.homeLabel}{hf && <span className="flag">{hf}</span>}
            </div>
            <div className={`res ${m.status === 'live' ? 'live' : played ? '' : 'sched'}`.trim()}>
              {played ? `${m.homeScore}–${m.awayScore}` : shortDate(m.kickoff)}
            </div>
            <div className="team">
              {af && <span className="flag">{af}</span>}{m.awayLabel}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

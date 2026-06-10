import { Card, SectionHeader } from './Card';
import type { MatchView } from '@/lib/view/matchView';
import { Flag } from './Flag';

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
        return (
          <div key={m.id} className="match">
            <div className="team a">
              {m.homeLabel}<Flag team={m.homeLabel} />
            </div>
            <div className={`res ${m.status === 'live' ? 'live' : played ? '' : 'sched'}`.trim()}>
              {played ? `${m.homeScore}–${m.awayScore}` : shortDate(m.kickoff)}
            </div>
            <div className="team">
              <Flag team={m.awayLabel} />{m.awayLabel}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

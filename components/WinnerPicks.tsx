import { Card, SectionHeader } from './Card';
import { Avatar } from './Avatar';
import { Flag } from './Flag';
import type { WinnerVotes } from '@/lib/view/extraStats';

function VoteList({ heading, votes }: { heading: string; votes: WinnerVotes[] }) {
  if (votes.length === 0) return null;
  return (
    <>
      <div className="wv-heading">{heading}</div>
      {votes.map((v) => (
        <div key={v.teamId} className="wv-row">
          <span className="wv-team"><Flag team={v.teamName} /> {v.teamName}</span>
          <span className="wv-faces">
            {v.voters.map((p) => (
              <Avatar key={p.userId} name={p.name} color={p.color} avatarUrl={p.avatarUrl} size={22} />
            ))}
          </span>
          <span className="wv-count">{v.voters.length}</span>
        </div>
      ))}
    </>
  );
}

export function WinnerPicks({ champion, finalists, bronze }: { champion: WinnerVotes[]; finalists: WinnerVotes[]; bronze: WinnerVotes[] }) {
  const empty = champion.length === 0 && finalists.length === 0 && bronze.length === 0;
  return (
    <Card>
      <SectionHeader title="Vem tror på vem?" caption="Allas vinnar-, finalist- och bronstips" />
      {empty && <p className="empty">Inga bonustips ännu.</p>}
      <VoteList heading="VM-vinnare" votes={champion} />
      <VoteList heading="Finalister" votes={finalists} />
      <VoteList heading="Brons" votes={bronze} />
    </Card>
  );
}

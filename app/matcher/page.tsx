import { MatchList } from '@/components/MatchList';
import { loadMatchViews } from '@/lib/view/serverData';

export const dynamic = 'force-dynamic';

export default async function MatcherPage() {
  const matches = await loadMatchViews();
  const groupMatches = matches.filter((m) => m.stage === 'group');
  const knockoutMatches = matches.filter((m) => m.stage !== 'group');
  return (
    <div className="flex flex-col gap-4">
      <MatchList matches={groupMatches} title="GRUPPSPEL" />
      {knockoutMatches.length > 0 && <MatchList matches={knockoutMatches} title="SLUTSPEL" />}
    </div>
  );
}

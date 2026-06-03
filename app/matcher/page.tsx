import { MatchList } from '@/components/MatchList';
import { loadMatchViews } from '@/lib/view/serverData';

export const dynamic = 'force-dynamic';

export default async function MatcherPage() {
  const matches = await loadMatchViews();
  const groupMatches = matches.filter((m) => m.stage === 'group');
  return <MatchList matches={groupMatches} title="GRUPPSPEL" />;
}

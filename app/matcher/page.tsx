import { MatchList } from '@/components/MatchList';
import { DailyPredictions } from '@/components/DailyPredictions';
import { loadMatchViews, loadDailyOverview } from '@/lib/view/serverData';

export const dynamic = 'force-dynamic';

export default async function MatcherPage() {
  const [matches, overview] = await Promise.all([loadMatchViews(), loadDailyOverview()]);
  const groupMatches = matches.filter((m) => m.stage === 'group');
  const knockoutMatches = matches.filter((m) => m.stage !== 'group');
  return (
    <div className="stack">
      <DailyPredictions overview={overview} />
      <MatchList matches={groupMatches} title="Gruppspel" caption="Tider i svensk tid" />
      {knockoutMatches.length > 0 && <MatchList matches={knockoutMatches} title="Slutspel" caption="Tider i svensk tid" />}
    </div>
  );
}

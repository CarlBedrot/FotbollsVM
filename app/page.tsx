import { RaceBarometer } from '@/components/RaceBarometer';
import { Leaderboard } from '@/components/Leaderboard';
import { MatchList } from '@/components/MatchList';
import { StatGrid } from '@/components/StatGrid';
import { computeStats } from '@/lib/view/stats';
import { loadStandingsView, loadMatchViews } from '@/lib/view/serverData';

export const dynamic = 'force-dynamic';

export default async function LoppetPage() {
  const [standings, matches] = await Promise.all([loadStandingsView(), loadMatchViews()]);
  const recent = matches.filter((m) => m.stage === 'group').slice(0, 6);
  return (
    <div className="stack">
      <RaceBarometer standings={standings} />
      <div className="twocol">
        <Leaderboard standings={standings} limit={6} />
        <MatchList matches={recent} title="Matcher" caption="Senaste & kommande" />
      </div>
      <StatGrid stats={computeStats(standings)} />
    </div>
  );
}

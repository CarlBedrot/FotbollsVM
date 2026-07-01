import { StatGrid } from '@/components/StatGrid';
import { PickSplit } from '@/components/PickSplit';
import { WinnerPicks } from '@/components/WinnerPicks';
import { GoalsFacitCard } from '@/components/GoalsFacit';
import { Card, SectionHeader } from '@/components/Card';
import { computeStats } from '@/lib/view/stats';
import { loadStandingsView, loadExtraStats, loadGoalsFacit } from '@/lib/view/serverData';

export const dynamic = 'force-dynamic';

export default async function StatistikPage() {
  const [standings, extra, goalsFacit] = await Promise.all([loadStandingsView(), loadExtraStats(), loadGoalsFacit()]);
  return (
    <div className="stack">
      <StatGrid stats={computeStats(standings)} />
      <GoalsFacitCard facit={goalsFacit} />
      {!extra.revealed && (
        <Card>
          <SectionHeader title="Mer på gång" caption="1/X/2-fördelning och vinnartips" />
          <p className="empty">Allas tips avslöjas när tipsen låses vid första avspark — då vaknar tavlorna här.</p>
        </Card>
      )}
      {extra.revealed && (
        <div className="twocol">
          <PickSplit split={extra.split} />
          <WinnerPicks champion={extra.winners.champion} finalists={extra.winners.finalists} bronze={extra.winners.bronze} />
        </div>
      )}
    </div>
  );
}

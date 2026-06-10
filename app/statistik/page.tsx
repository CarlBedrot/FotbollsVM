import { StatGrid } from '@/components/StatGrid';
import { OddsDistance } from '@/components/OddsDistance';
import { BestOddsHits } from '@/components/BestOddsHits';
import { PickSplit } from '@/components/PickSplit';
import { WinnerPicks } from '@/components/WinnerPicks';
import { Card, SectionHeader } from '@/components/Card';
import { computeStats } from '@/lib/view/stats';
import { loadStandingsView, loadExtraStats } from '@/lib/view/serverData';

export const dynamic = 'force-dynamic';

export default async function StatistikPage() {
  const [standings, extra] = await Promise.all([loadStandingsView(), loadExtraStats()]);
  return (
    <div className="stack">
      <StatGrid stats={computeStats(standings)} />
      {!extra.revealed && (
        <Card>
          <SectionHeader title="Mer på gång" caption="Oddsavstånd, skrällar, 1/X/2-fördelning och vinnartips" />
          <p className="empty">Allas tips avslöjas när tipsen låses vid första avspark — då vaknar tavlorna här.</p>
        </Card>
      )}
      {extra.revealed && (
        <>
          <div className="twocol">
            <OddsDistance rows={extra.distance} hasOdds={extra.hasOdds} />
            <BestOddsHits hits={extra.hits} hasOdds={extra.hasOdds} />
          </div>
          <div className="twocol">
            <PickSplit split={extra.split} />
            <WinnerPicks champion={extra.winners.champion} finalists={extra.winners.finalists} bronze={extra.winners.bronze} />
          </div>
        </>
      )}
    </div>
  );
}

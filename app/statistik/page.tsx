import { StatGrid } from '@/components/StatGrid';
import { computeStats } from '@/lib/view/stats';
import { loadStandingsView } from '@/lib/view/serverData';

export const dynamic = 'force-dynamic';

export default async function StatistikPage() {
  const standings = await loadStandingsView();
  return <StatGrid stats={computeStats(standings)} />;
}

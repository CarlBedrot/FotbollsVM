import { Leaderboard } from '@/components/Leaderboard';
import { loadStandingsView } from '@/lib/view/serverData';

export const dynamic = 'force-dynamic';

export default async function TabellPage() {
  const standings = await loadStandingsView();
  return <Leaderboard standings={standings} />;
}

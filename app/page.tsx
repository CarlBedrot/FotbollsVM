import { RaceBarometer } from '@/components/RaceBarometer';
import { Leaderboard } from '@/components/Leaderboard';
import { loadStandingsView } from '@/lib/view/serverData';

export const dynamic = 'force-dynamic';

export default async function LoppetPage() {
  const standings = await loadStandingsView();
  return (
    <div className="flex flex-col gap-4">
      <RaceBarometer standings={standings} />
      <Leaderboard standings={standings} limit={5} />
    </div>
  );
}

import { Card, SectionHeader } from '@/components/Card';
import { UtvecklingView } from '@/components/UtvecklingView';
import { loadPointsTimeline, loadStandingsView } from '@/lib/view/serverData';

export const dynamic = 'force-dynamic';

export default async function UtvecklingPage() {
  const [timeline, players] = await Promise.all([loadPointsTimeline(), loadStandingsView()]);

  return (
    <div className="stack">
      <Card>
        <SectionHeader
          title="Poäng per match"
          caption="Varje linje visar en spelares kumulativa poäng efter varje avslutad match."
        />
        {timeline.steps.length === 0 ? (
          <p className="empty">Inga avslutade matcher än — grafen vaknar när resultaten börjar trilla in.</p>
        ) : (
          <UtvecklingView timeline={timeline} players={players} />
        )}
      </Card>
    </div>
  );
}

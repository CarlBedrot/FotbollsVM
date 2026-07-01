import { Card, SectionHeader } from '@/components/Card';
import { KvarView } from '@/components/KvarView';
import { loadRemaining } from '@/lib/view/serverData';

export const dynamic = 'force-dynamic';

export default async function KvarPage() {
  const rows = await loadRemaining();
  const anyReachable = rows.some((r) => r.reachable > 0);

  return (
    <div className="stack">
      <Card>
        <SectionHeader
          title="Kvar att hämta"
          caption="Efter gruppspelet: max poäng var och en kan sluta på, om deras kvarvarande slutspels-tips går hela vägen."
        />
        {rows.length === 0 ? (
          <p className="empty">Inga poäng räknade än — den här vaknar när ställningen finns.</p>
        ) : (
          <>
            {!anyReachable && (
              <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                Alla slutspels-bonusar är avgjorda — ingen har mer att hämta.
              </p>
            )}
            <KvarView rows={rows} />
          </>
        )}
      </Card>
    </div>
  );
}

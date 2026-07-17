import { Card, SectionHeader } from './Card';
import { Flag } from './Flag';
import { RULES } from '@/lib/domain/rules';
import type { GoalsFacit, GoalsFacitSide } from '@/lib/view/goalsFacit';

function Row({ heading, side }: { heading: string; side: GoalsFacitSide }) {
  return (
    <div className="wv-row">
      <span className="wv-heading" style={{ margin: 0 }}>{heading}</span>
      <span className="wv-team">
        {side.teamNames.map((name, i) => (
          <span key={name}>
            {i > 0 && ', '}
            <Flag team={name} /> {name}
          </span>
        ))}
      </span>
      <span style={{ fontWeight: 800, whiteSpace: 'nowrap', color: 'var(--yellow)' }}>{side.goals} mål</span>
    </div>
  );
}

export function GoalsFacitCard({ facit }: { facit: GoalsFacit }) {
  return (
    <Card>
      <SectionHeader title="Flest & färst mål" caption={`Gruppspelets mål-facit — ${RULES.mostGoalsPoint} poäng styck`} />
      {!facit.complete ? (
        <p className="empty">Visas när gruppspelet är färdigspelat.</p>
      ) : (
        <>
          <Row heading="Flest mål" side={facit.most} />
          <Row heading="Färst mål" side={facit.fewest} />
        </>
      )}
    </Card>
  );
}

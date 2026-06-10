import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, SectionHeader } from '@/components/Card';
import { Flag } from '@/components/Flag';
import { currentUser } from '@/lib/auth/currentUser';
import { getPredictionRepository } from '@/lib/db/repository';
import { loadFixtures } from '@/lib/fixtures/load';
import { buildMyTips, type MyTipsGroup } from '@/lib/view/myTips';

export const dynamic = 'force-dynamic';

function shortDate(iso: string) {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)}/${Number(m)}`;
}

function BonusRow({ label, team }: { label: string; team: string | null }) {
  return (
    <div className="mt-bonus-row">
      <span className="muted">{label}</span>
      <span className="mt-bonus-team">{team ? <><Flag team={team} /> {team}</> : '—'}</span>
    </div>
  );
}

function GroupCard({ g }: { g: MyTipsGroup }) {
  return (
    <div className="mt-group">
      <div className="mt-group-h">Grupp {g.group}</div>
      {g.matches.map((m) => (
        <div key={m.id} className="mt-row">
          <div className="mt-match">
            <span className="mt-date">{shortDate(m.kickoff)}</span>
            <Flag team={m.homeLabel} /> {m.homeLabel} – {m.awayLabel} <Flag team={m.awayLabel} />
          </div>
          <span className={`pick-chip${m.pick ? '' : ' missing'}`}>{m.pick ?? '?'}</span>
        </div>
      ))}
    </div>
  );
}

export default async function MittTipsPage() {
  const user = await currentUser();
  if (!user) redirect('/login');
  const prediction = await getPredictionRepository().get(user.userId);
  const tips = buildMyTips(prediction, loadFixtures());

  if (!tips) {
    return (
      <Card>
        <SectionHeader title="Mitt tips" />
        <p className="empty">
          Du har inget tips sparat ännu. <Link className="link-accent" href="/tips">Ladda ner tipslappen och ladda upp den här.</Link>
        </p>
      </Card>
    );
  }

  return (
    <div className="stack">
      <Card>
        <SectionHeader title="Mitt tips" caption={`${tips.pickCount}/72 matchtips · ${tips.bonusCount}/18 bonustips — så här ligger din lapp`} />
        <div className="mt-bonus">
          <BonusRow label="VM-vinnare (16 p)" team={tips.champion} />
          <BonusRow label="Finalist (8 p)" team={tips.finalist1} />
          <BonusRow label="Finalist (8 p)" team={tips.finalist2} />
          <BonusRow label="Brons (8 p)" team={tips.bronze} />
          <BonusRow label="Flest mål (4 p)" team={tips.mostGoals} />
          <BonusRow label="Färst mål (4 p)" team={tips.fewestGoals} />
        </div>
        <div className="mt-group-h" style={{ marginTop: 14 }}>Gruppvinnare (4 p/grupp)</div>
        <div className="mt-winners">
          {tips.groupWinners.map((w) => (
            <span key={w.group} className="mt-winner">
              <b>{w.group}</b> {w.teamName ? <><Flag team={w.teamName} /> {w.teamName}</> : '—'}
            </span>
          ))}
        </div>
      </Card>
      <Card>
        <SectionHeader title="Matchtipsen" caption="1 = hemmaseger · X = oavgjort · 2 = bortaseger" />
        <div className="mt-groups">
          {tips.groups.map((g) => <GroupCard key={g.group} g={g} />)}
        </div>
      </Card>
    </div>
  );
}

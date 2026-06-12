import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, SectionHeader } from '@/components/Card';
import { TipsCarousel } from '@/components/TipsCarousel';
import { currentUser } from '@/lib/auth/currentUser';
import { getPredictionRepository, getUserRepository } from '@/lib/db/repository';
import { loadFixtures } from '@/lib/fixtures/load';
import { loadMatchViews } from '@/lib/view/serverData';
import { buildAllTips } from '@/lib/view/allTips';
import { isLocked } from '@/lib/tips/lock';

export const dynamic = 'force-dynamic';

export default async function MittTipsPage() {
  const user = await currentUser();
  if (!user) redirect('/login');

  const fixtures = loadFixtures();
  const [predictions, users, matches] = await Promise.all([
    getPredictionRepository().all(),
    getUserRepository().list(),
    loadMatchViews(),
  ]);
  const revealed = isLocked(fixtures.firstKickoff, new Date(), null);
  const all = buildAllTips({ meId: user.userId, users, predictions, matches, fixtures, revealed });

  const hasMine = all.players.some((p) => p.userId === user.userId);

  if (all.players.length === 0) {
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
        <SectionHeader
          title="Tipsen"
          caption={revealed ? 'Din lapp först — swajpa till de andra och jämför' : 'Andras tips avslöjas vid första avspark'}
        />
        {!hasMine && (
          <p className="empty">
            Du har inget eget tips ännu. <Link className="link-accent" href="/tips">Ladda upp din lapp.</Link>
          </p>
        )}
      </Card>
      <TipsCarousel data={all} />
    </div>
  );
}

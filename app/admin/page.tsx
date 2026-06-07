import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { Card, SectionHeader } from '@/components/Card';
import { CreateUser } from '@/components/admin/CreateUser';
import { PlayerList } from '@/components/admin/PlayerList';
import { EnterResult } from '@/components/admin/EnterResult';
import { SyncResults } from '@/components/admin/SyncResults';
import { UnlockUser } from '@/components/admin/UnlockUser';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await requireAdmin())) redirect('/');
  return (
    <div className="twocol">
      <Card>
        <SectionHeader title="Tipslapp" caption="Skicka ut den här till gänget att fylla i" />
        <a className="btn btn-accent" href="/api/template" style={{ display: 'inline-block', textDecoration: 'none' }}>Ladda ner tipslappen (.xlsx)</a>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>De fyller i och skickar tillbaka till dig — du laddar upp åt dem i "Spelare".</p>
      </Card>
      <Card><SectionHeader title="Spelare" caption="Hantera deltagare + ladda upp tips åt dem" /><PlayerList /></Card>
      <Card><SectionHeader title="Skapa konto" caption="Lägg till en spelare" /><CreateUser /></Card>
      <Card><SectionHeader title="Mata in resultat" caption="Manuellt per match" /><EnterResult /></Card>
      <Card><SectionHeader title="Hämta från API" caption="football-data.org" /><SyncResults /></Card>
      <Card><SectionHeader title="Lås upp tips" caption="Innan avspark" /><UnlockUser /></Card>
    </div>
  );
}

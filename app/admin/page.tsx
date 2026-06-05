import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { Card, SectionHeader } from '@/components/Card';
import { CreateUser } from '@/components/admin/CreateUser';
import { EnterResult } from '@/components/admin/EnterResult';
import { SyncResults } from '@/components/admin/SyncResults';
import { UnlockUser } from '@/components/admin/UnlockUser';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await requireAdmin())) redirect('/');
  return (
    <div className="twocol">
      <Card><SectionHeader title="Skapa konto" caption="Lägg till en spelare" /><CreateUser /></Card>
      <Card><SectionHeader title="Mata in resultat" caption="Manuellt per match" /><EnterResult /></Card>
      <Card><SectionHeader title="Hämta från API" caption="football-data.org" /><SyncResults /></Card>
      <Card><SectionHeader title="Lås upp tips" caption="Innan avspark" /><UnlockUser /></Card>
    </div>
  );
}

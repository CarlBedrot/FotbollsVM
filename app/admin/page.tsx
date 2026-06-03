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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card><SectionHeader pill="Admin" pillColor="#2b5fd0" title="SKAPA KONTO" /><CreateUser /></Card>
      <Card><SectionHeader pill="Admin" pillColor="#e23b3b" title="MATA IN RESULTAT" /><EnterResult /></Card>
      <Card><SectionHeader pill="Admin" pillColor="#1b9e5a" title="HÄMTA FRÅN API" /><SyncResults /></Card>
      <Card><SectionHeader pill="Admin" pillColor="#f5b833" title="LÅS UPP TIPS" /><UnlockUser /></Card>
    </div>
  );
}

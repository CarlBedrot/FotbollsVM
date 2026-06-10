import Link from 'next/link';
import { Card, SectionHeader } from '@/components/Card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ChangePassword } from '@/components/ChangePassword';
import { LogoutButton } from '@/components/LogoutButton';

export default function SettingsPage() {
  return (
    <div className="stack" style={{ maxWidth: 520, margin: '0 auto' }}>
      <Card>
        <SectionHeader title="Tema" caption="Välj appens utseende" />
        <ThemeToggle />
      </Card>

      <Card>
        <SectionHeader title="Byt lösenord" caption="Uppdatera ditt lösenord" />
        <ChangePassword />
      </Card>

      <Card>
        <SectionHeader title="Profil" />
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Profilbild, visningsnamn och färg ändrar du på{' '}
          <Link className="link-accent" href="/profil">Min profil</Link>.
        </p>
      </Card>

      <Card>
        <SectionHeader title="Konto" />
        <LogoutButton />
      </Card>
    </div>
  );
}

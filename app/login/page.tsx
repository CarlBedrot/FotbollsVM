'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) });
    setLoading(false);
    if (res.ok) { router.push('/'); router.refresh(); return; }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? 'inloggning misslyckades');
  }

  return (
    <main className="max-w-[360px] mx-auto mt-[12vh]">
      <div className="retro-card p-6">
        <h1 className="anton text-3xl mb-4">VM-TIPSET <span className="text-vmred">2026</span></h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
          <input className="border-[2.5px] border-ink rounded-lg px-3 py-2" placeholder="Användarnamn" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          <input className="border-[2.5px] border-ink rounded-lg px-3 py-2" type="password" placeholder="Lösenord" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <button type="submit" disabled={loading} className="retro-tab retro-tab-active !text-white cursor-pointer">{loading ? 'Loggar in…' : 'Logga in'}</button>
          {error && <p className="text-vmred font-bold text-sm">{error}</p>}
        </form>
      </div>
    </main>
  );
}

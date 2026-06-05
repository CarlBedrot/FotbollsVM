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
    <main style={{ maxWidth: 360, margin: '12vh auto 0' }}>
      <div className="card sec">
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>VM-tipset <span style={{ color: 'var(--accent)' }}>2026</span></h1>
        <div className="cap">Logga in för att tippa och följa loppet</div>
        <form onSubmit={onSubmit} className="formgrid">
          <input className="input" placeholder="Användarnamn" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          <input className="input" type="password" placeholder="Lösenord" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <button type="submit" disabled={loading} className="btn btn-accent">{loading ? 'Loggar in…' : 'Logga in'}</button>
          {error && <p className="error" style={{ fontSize: 13 }}>{error}</p>}
        </form>
      </div>
    </main>
  );
}

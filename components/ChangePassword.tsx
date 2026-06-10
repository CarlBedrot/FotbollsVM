'use client';
import { useState } from 'react';

export function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const res = await fetch('/api/me/password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    setOk(res.ok);
    if (res.ok) {
      setMsg('Lösenord uppdaterat!');
      setCurrent('');
      setNext('');
    } else {
      setMsg(d.error ?? 'Kunde inte byta lösenord');
    }
  }

  return (
    <form onSubmit={submit} className="formgrid">
      <input
        className="input"
        type="password"
        placeholder="Nuvarande lösenord"
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
      />
      <input
        className="input"
        type="password"
        placeholder="Nytt lösenord (minst 4 tecken)"
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
      />
      <button className="btn btn-accent" disabled={busy || !current || !next}>
        {busy ? 'Sparar…' : 'Byt lösenord'}
      </button>
      {msg && <p style={{ margin: 0, fontWeight: 700, color: ok ? 'var(--accent)' : 'var(--red)' }}>{msg}</p>}
    </form>
  );
}

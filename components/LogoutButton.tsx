'use client';
import { useState } from 'react';

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login';
  }
  return (
    <button className="btn" onClick={logout} disabled={busy}>
      {busy ? 'Loggar ut…' : 'Logga ut'}
    </button>
  );
}

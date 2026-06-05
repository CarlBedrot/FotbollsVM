'use client';
import { useState } from 'react';

export function UnlockUser() {
  const [userId, setUserId] = useState('');
  const [msg, setMsg] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/unlock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId, unlocked: true }) });
    setMsg(res.ok ? 'Upplåst.' : 'fel');
  }
  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input className="input" style={{ flex: 1 }} placeholder="user-id att låsa upp" value={userId} onChange={(e) => setUserId(e.target.value)} />
      <button className="btn">Lås upp</button>
      {msg && <span style={{ fontWeight: 700 }}>{msg}</span>}
    </form>
  );
}

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
    <form onSubmit={submit} className="flex gap-2">
      <input className="border-[2.5px] border-ink rounded-lg px-3 py-2 flex-1" placeholder="user-id att låsa upp" value={userId} onChange={(e) => setUserId(e.target.value)} />
      <button className="retro-tab cursor-pointer">Lås upp tips</button>
      {msg && <span className="self-center font-bold">{msg}</span>}
    </form>
  );
}

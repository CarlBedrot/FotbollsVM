'use client';
import { useState } from 'react';

export function CreateUser() {
  const [f, setF] = useState({ username: '', displayName: '', password: '', color: '#2b5fd0', isAdmin: false });
  const [msg, setMsg] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Skapade ${d.user.displayName}` : (d.error ?? 'fel'));
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <input className="border-[2.5px] border-ink rounded-lg px-3 py-2" placeholder="Användarnamn" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
      <input className="border-[2.5px] border-ink rounded-lg px-3 py-2" placeholder="Visningsnamn" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />
      <input className="border-[2.5px] border-ink rounded-lg px-3 py-2" placeholder="Lösenord" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      <label className="flex items-center gap-2"><span>Färg</span><input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} /></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={f.isAdmin} onChange={(e) => setF({ ...f, isAdmin: e.target.checked })} /> Admin</label>
      <button className="retro-tab retro-tab-active !text-white cursor-pointer">Skapa konto</button>
      {msg && <p className="font-bold">{msg}</p>}
    </form>
  );
}

'use client';
import { useState } from 'react';

export function CreateUser() {
  const [f, setF] = useState({ username: '', displayName: '', password: '', color: '#3b82f6', isAdmin: false });
  const [msg, setMsg] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Skapade ${d.user.displayName}` : (d.error ?? 'fel'));
  }
  return (
    <form onSubmit={submit} className="formgrid">
      <input className="input" placeholder="Användarnamn" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
      <input className="input" placeholder="Visningsnamn" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />
      <input className="input" placeholder="Lösenord" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="muted"><span>Färg</span><input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} /></label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="muted"><input type="checkbox" checked={f.isAdmin} onChange={(e) => setF({ ...f, isAdmin: e.target.checked })} /> Admin</label>
      <button className="btn btn-accent">Skapa konto</button>
      {msg && <p style={{ fontWeight: 700 }}>{msg}</p>}
    </form>
  );
}

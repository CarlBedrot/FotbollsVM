'use client';
import { useState } from 'react';

export function EnterResult() {
  const [f, setF] = useState({ matchId: '', homeScore: 0, awayScore: 0 });
  const [msg, setMsg] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/results', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ matchId: f.matchId, homeScore: Number(f.homeScore), awayScore: Number(f.awayScore) }) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? 'Resultat sparat, ställning omräknad.' : (d.error ?? 'fel'));
  }
  return (
    <form onSubmit={submit} className="formgrid">
      <input className="input" placeholder="Match-id (t.ex. G001)" value={f.matchId} onChange={(e) => setF({ ...f, matchId: e.target.value })} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="number" className="input" style={{ width: 80 }} value={f.homeScore} onChange={(e) => setF({ ...f, homeScore: Number(e.target.value) })} />
        <span style={{ fontWeight: 800 }}>–</span>
        <input type="number" className="input" style={{ width: 80 }} value={f.awayScore} onChange={(e) => setF({ ...f, awayScore: Number(e.target.value) })} />
      </div>
      <button className="btn btn-accent">Spara resultat</button>
      {msg && <p style={{ fontWeight: 700 }}>{msg}</p>}
    </form>
  );
}

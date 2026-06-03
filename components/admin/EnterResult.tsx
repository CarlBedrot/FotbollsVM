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
    <form onSubmit={submit} className="flex flex-col gap-2">
      <input className="border-[2.5px] border-ink rounded-lg px-3 py-2" placeholder="Match-id (t.ex. G001)" value={f.matchId} onChange={(e) => setF({ ...f, matchId: e.target.value })} />
      <div className="flex gap-2">
        <input type="number" className="border-[2.5px] border-ink rounded-lg px-3 py-2 w-20" value={f.homeScore} onChange={(e) => setF({ ...f, homeScore: Number(e.target.value) })} />
        <span className="self-center font-extrabold">–</span>
        <input type="number" className="border-[2.5px] border-ink rounded-lg px-3 py-2 w-20" value={f.awayScore} onChange={(e) => setF({ ...f, awayScore: Number(e.target.value) })} />
      </div>
      <button className="retro-tab retro-tab-active !text-white cursor-pointer">Spara resultat</button>
      {msg && <p className="font-bold">{msg}</p>}
    </form>
  );
}

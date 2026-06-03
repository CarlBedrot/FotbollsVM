'use client';
import { useState } from 'react';

interface Proposal { matchId: string; homeLabel: string; awayLabel: string; homeScore: number; awayScore: number; matchedBy: string; }

export function SyncResults() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [msg, setMsg] = useState('');
  async function sync() {
    setMsg('Hämtar…');
    const res = await fetch('/api/admin/results/sync', { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setProposals(d.proposals.filter((p: Proposal) => p.matchId)); setMsg(`${d.proposals.length} förslag (${d.proposals.filter((p: Proposal) => !p.matchId).length} omappade).`); }
    else setMsg(d.error ?? 'kunde inte hämta');
  }
  async function apply() {
    const res = await fetch('/api/admin/results/apply', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ results: proposals.map((p) => ({ matchId: p.matchId, homeScore: p.homeScore, awayScore: p.awayScore })) }) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Tillämpade ${d.applied} resultat, ställning omräknad.` : (d.error ?? 'fel'));
    setProposals([]);
  }
  return (
    <div className="flex flex-col gap-2">
      <button className="retro-tab cursor-pointer" onClick={sync}>Hämta dagens resultat (API)</button>
      {proposals.length > 0 && (
        <>
          <ul className="text-sm">{proposals.map((p) => <li key={p.matchId}>{p.homeLabel} {p.homeScore}–{p.awayScore} {p.awayLabel} <span className="text-[#8a7d5e]">({p.matchedBy})</span></li>)}</ul>
          <button className="retro-tab retro-tab-active !text-white cursor-pointer" onClick={apply}>Godkänn & spara</button>
        </>
      )}
      {msg && <p className="font-bold">{msg}</p>}
    </div>
  );
}

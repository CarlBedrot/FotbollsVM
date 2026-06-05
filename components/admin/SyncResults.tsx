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
    <div className="formgrid">
      <button className="btn" onClick={sync}>Hämta dagens resultat (API)</button>
      {proposals.length > 0 && (
        <>
          <ul style={{ fontSize: 13, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {proposals.map((p) => (
              <li key={p.matchId}>{p.homeLabel} {p.homeScore}–{p.awayScore} {p.awayLabel} <span className="muted">({p.matchedBy})</span></li>
            ))}
          </ul>
          <button className="btn btn-accent" onClick={apply}>Godkänn &amp; spara</button>
        </>
      )}
      {msg && <p style={{ fontWeight: 700 }}>{msg}</p>}
    </div>
  );
}

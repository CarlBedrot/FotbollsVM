'use client';
import { useState } from 'react';

interface Parsed { name: string | null; matchPicks: Record<string, string>; bonus: Record<string, string>; warnings: string[]; }

export default function TipsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(url: string) {
    if (!file) return;
    setBusy(true); setMsg(null);
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch(url, { method: 'POST', body: fd });
    setBusy(false);
    return { res, data: await res.json().catch(() => ({})) };
  }
  async function preview() { const r = await post('/api/predictions/preview'); if (r) { if (r.res.ok) setParsed(r.data.parsed); else setMsg(r.data.error ?? 'kunde inte läsa filen'); } }
  async function save() { const r = await post('/api/predictions'); if (r) setMsg(r.res.ok ? `Sparat! ${r.data.saved.matches} matcher, ${r.data.saved.bonus} bonus.` : (r.data.error ?? 'kunde inte spara')); }

  return (
    <div className="card sec" style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>Ladda upp ditt tips</h1>
      <div className="cap">
        <a className="link-accent" href="/api/template">Ladda ner tipslappen (.xlsx)</a> — fyll i och ladda upp nedan.
      </div>
      <input type="file" accept=".xlsx" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setParsed(null); setMsg(null); }} style={{ fontSize: 13 }} />
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button className="btn" onClick={preview} disabled={!file || busy}>Visa tolkning</button>
        <button className="btn btn-accent" onClick={save} disabled={!file || busy}>Spara tips</button>
      </div>
      {msg && <p style={{ marginTop: 12, fontWeight: 700 }}>{msg}</p>}
      {parsed && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Så här tolkade vi ditt tips</h2>
          <p>Namn: {parsed.name ?? '—'}</p>
          <p className="muted">Matchtips: {Object.keys(parsed.matchPicks).length} / 72 · Bonus: {Object.keys(parsed.bonus).length} / 18</p>
          {parsed.warnings.length > 0 && (
            <ul className="error" style={{ listStyle: 'disc', marginLeft: 20, marginTop: 6 }}>
              {parsed.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Stämmer det? Klicka &quot;Spara tips&quot;.</p>
        </div>
      )}
    </div>
  );
}

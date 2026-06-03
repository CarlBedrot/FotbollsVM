'use client';

import { useState } from 'react';

interface Parsed {
  name: string | null;
  matchPicks: Record<string, string>;
  bonus: Record<string, string>;
  warnings: string[];
}

export default function TipsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function preview() {
    if (!file) return;
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/predictions/preview', { method: 'POST', body: fd });
    setBusy(false);
    const data = await res.json();
    if (res.ok) setParsed(data.parsed);
    else setMsg(data.error ?? 'kunde inte läsa filen');
  }

  async function save() {
    if (!file) return;
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/predictions', { method: 'POST', body: fd });
    setBusy(false);
    const data = await res.json();
    setMsg(res.ok ? `Sparat! ${data.saved.matches} matcher, ${data.saved.bonus} bonus.` : (data.error ?? 'kunde inte spara'));
  }

  return (
    <main style={{ maxWidth: 640, margin: '6vh auto', padding: 24 }}>
      <h1>Ladda upp ditt tips</h1>
      <p>
        <a href="/api/template">Ladda ner tipslappen (.xlsx)</a> — fyll i den och ladda upp nedan.
      </p>
      <input
        type="file"
        accept=".xlsx"
        onChange={(e) => { setFile(e.target.files?.[0] ?? null); setParsed(null); setMsg(null); }}
      />
      <div style={{ marginTop: 12 }}>
        <button onClick={preview} disabled={!file || busy}>Visa tolkning</button>{' '}
        <button onClick={save} disabled={!file || busy}>Spara tips</button>
      </div>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
      {parsed && (
        <section style={{ marginTop: 16 }}>
          <h2>Så här tolkade vi ditt tips</h2>
          <p>Namn: {parsed.name ?? '—'}</p>
          <p>Antal matchtips: {Object.keys(parsed.matchPicks).length} / 72</p>
          <p>Antal bonussvar: {Object.keys(parsed.bonus).length} / 18</p>
          {parsed.warnings.length > 0 && (
            <ul style={{ color: '#e23b3b' }}>
              {parsed.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
          <p style={{ fontSize: 13, color: '#666' }}>Kontrollera ovan och klicka &quot;Spara tips&quot; om det stämmer.</p>
        </section>
      )}
    </main>
  );
}

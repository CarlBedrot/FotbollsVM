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
    <div className="retro-card p-6 max-w-[640px] mx-auto">
      <h1 className="anton text-3xl mb-2">Ladda upp ditt tips</h1>
      <p className="mb-3"><a className="font-extrabold underline" href="/api/template">Ladda ner tipslappen (.xlsx)</a> — fyll i och ladda upp nedan.</p>
      <input type="file" accept=".xlsx" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setParsed(null); setMsg(null); }} />
      <div className="mt-3 flex gap-2">
        <button className="retro-tab cursor-pointer" onClick={preview} disabled={!file || busy}>Visa tolkning</button>
        <button className="retro-tab retro-tab-active !text-white cursor-pointer" onClick={save} disabled={!file || busy}>Spara tips</button>
      </div>
      {msg && <p className="mt-3 font-bold">{msg}</p>}
      {parsed && (
        <div className="mt-4 border-t-2 border-dashed border-[#e4d6b4] pt-4">
          <h2 className="anton text-xl mb-2">Så här tolkade vi ditt tips</h2>
          <p>Namn: {parsed.name ?? '—'}</p>
          <p>Matchtips: {Object.keys(parsed.matchPicks).length} / 72 · Bonus: {Object.keys(parsed.bonus).length} / 18</p>
          {parsed.warnings.length > 0 && <ul className="text-vmred list-disc ml-5">{parsed.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
          <p className="text-sm text-[#666] mt-2">Stämmer det? Klicka &quot;Spara tips&quot;.</p>
        </div>
      )}
    </div>
  );
}

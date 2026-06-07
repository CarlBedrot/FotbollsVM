'use client';
import { useEffect, useState } from 'react';

type Player = {
  id: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
  color: string;
  avatarUrl: string | null;
};

type EditState = { displayName: string; color: string; password: string; isAdmin: boolean };

export function PlayerList() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState>({ displayName: '', color: '#3ee089', password: '', isAdmin: false });
  const [error, setError] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [tipBusyId, setTipBusyId] = useState<string | null>(null);
  const [tipMsg, setTipMsg] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch('/api/admin/users');
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setPlayers(d.users ?? []);
      setError('');
    } else {
      setError(d.error ?? 'kunde inte hämta spelare');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(p: Player) {
    setEditingId(p.id);
    setEdit({ displayName: p.displayName, color: p.color, password: '', isAdmin: p.isAdmin });
  }

  async function saveEdit(id: string) {
    const body: { displayName: string; color: string; isAdmin: boolean; password?: string } = {
      displayName: edit.displayName,
      color: edit.color,
      isAdmin: edit.isAdmin,
    };
    if (edit.password) body.password = edit.password;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEditingId(null);
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'kunde inte spara');
    }
  }

  async function uploadPhoto(id: string, file: File) {
    setUploadingId(id);
    setError('');
    const body = new FormData();
    body.append('file', file);
    const res = await fetch(`/api/admin/users/${id}/avatar`, { method: 'POST', body });
    setUploadingId(null);
    if (res.ok) {
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'kunde inte ladda upp foto');
    }
  }

  async function uploadTip(id: string, file: File) {
    setTipBusyId(id);
    setTipMsg((m) => ({ ...m, [id]: 'Laddar upp…' }));
    const body = new FormData();
    body.append('file', file);
    const res = await fetch(`/api/admin/users/${id}/prediction`, { method: 'POST', body });
    const d = await res.json().catch(() => ({}));
    setTipBusyId(null);
    if (res.ok) {
      const warn = (d.warnings ?? []) as string[];
      const base = `Sparat: ${d.saved.matches}/72 matcher, ${d.saved.bonus}/18 bonus.`;
      setTipMsg((m) => ({ ...m, [id]: warn.length ? `${base} ⚠ ${warn.length} varning(ar): ${warn.join(' ')}` : base }));
      await load();
    } else {
      setTipMsg((m) => ({ ...m, [id]: d.error ?? 'kunde inte ladda upp tipset' }));
    }
  }

  async function remove(p: Player) {
    if (!confirm(`Ta bort ${p.displayName}?`)) return;
    const res = await fetch(`/api/admin/users/${p.id}`, { method: 'DELETE' });
    if (res.ok) {
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'kunde inte ta bort');
    }
  }

  return (
    <div>
      {error && <p className="error">{error}</p>}
      {players.length === 0 && <p className="muted">Inga spelare.</p>}
      {players.map((p) =>
        editingId === p.id ? (
          <div key={p.id} className="formgrid" style={{ padding: '9px 0', borderTop: '1px solid var(--line)' }}>
            <input className="input" placeholder="Visningsnamn" value={edit.displayName} onChange={(e) => setEdit({ ...edit, displayName: e.target.value })} />
            <input className="input" placeholder="Nytt lösenord (valfritt)" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="muted"><span>Färg</span><input type="color" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} /></label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="muted"><input type="checkbox" checked={edit.isAdmin} onChange={(e) => setEdit({ ...edit, isAdmin: e.target.checked })} /> Admin</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-accent" onClick={() => saveEdit(p.id)}>Spara</button>
              <button className="btn" onClick={() => setEditingId(null)}>Avbryt</button>
            </div>
          </div>
        ) : (
          <div key={p.id} style={{ padding: '9px 0', borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: p.color, flex: '0 0 auto', overflow: 'hidden' }}>
                {p.avatarUrl && <img src={p.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </span>
              <span style={{ flex: 1, minWidth: 140 }}>
                {p.displayName} <span className="muted">@{p.username}{p.isAdmin ? ' · admin' : ''}</span>
              </span>
              <label className="btn" style={{ display: 'inline-flex', alignItems: 'center' }}>
                {uploadingId === p.id ? 'Laddar upp…' : 'Foto'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploadingId === p.id}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadPhoto(p.id, file);
                    e.target.value = '';
                  }}
                />
              </label>
              <label className="btn" style={{ display: 'inline-flex', alignItems: 'center' }}>
                {tipBusyId === p.id ? 'Laddar upp…' : 'Ladda upp tips'}
                <input
                  type="file"
                  accept=".xlsx"
                  disabled={tipBusyId === p.id}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadTip(p.id, file);
                    e.target.value = '';
                  }}
                />
              </label>
              <button className="btn" onClick={() => startEdit(p)}>Redigera</button>
              <button className="btn" onClick={() => remove(p)}>Ta bort</button>
            </div>
            {tipMsg[p.id] && <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>{tipMsg[p.id]}</p>}
          </div>
        ),
      )}
    </div>
  );
}

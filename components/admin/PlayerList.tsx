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
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderTop: '1px solid var(--line)' }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: p.color, flex: '0 0 auto', overflow: 'hidden' }}>
              {p.avatarUrl && <img src={p.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </span>
            <span style={{ flex: 1 }}>
              {p.displayName} <span className="muted">@{p.username}{p.isAdmin ? ' · admin' : ''}</span>
            </span>
            <button className="btn" onClick={() => startEdit(p)}>Redigera</button>
            <button className="btn" onClick={() => remove(p)}>Ta bort</button>
          </div>
        ),
      )}
    </div>
  );
}

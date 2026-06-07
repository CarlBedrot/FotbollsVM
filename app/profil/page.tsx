'use client';
import { useEffect, useState } from 'react';
import { Avatar } from '@/components/Avatar';

interface Me {
  username: string;
  displayName: string;
  color: string;
  avatarUrl: string | null;
}

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [color, setColor] = useState('#3ee089');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/me');
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMe(d.user);
      setDisplayName(d.user.displayName);
      setColor(d.user.color);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function uploadPhoto(file: File) {
    setBusy(true);
    setMsg('Laddar upp…');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/me/avatar', { method: 'POST', body: fd });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setMe((m) => (m ? { ...m, avatarUrl: d.avatarUrl } : m));
      setMsg('Profilbild uppdaterad!');
    } else {
      setMsg(d.error ?? 'kunde inte ladda upp');
    }
  }

  async function saveProfile() {
    setBusy(true);
    setMsg('');
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName, color }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? 'Sparat!' : (d.error ?? 'kunde inte spara'));
    if (res.ok) setMe((m) => (m ? { ...m, displayName, color } : m));
  }

  if (!me) {
    return (
      <div className="card sec" style={{ maxWidth: 480, margin: '0 auto' }}>
        <p className="muted">Laddar…</p>
      </div>
    );
  }

  return (
    <div className="card sec" style={{ maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>Min profil</h1>
      <div className="cap">@{me.username}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '14px 0' }}>
        <Avatar name={displayName || me.displayName} color={color} avatarUrl={me.avatarUrl} size={72} />
        <label className="btn" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {busy ? 'Laddar upp…' : 'Ladda upp profilbild'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadPhoto(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <div className="formgrid">
        <label className="muted" style={{ fontSize: 13 }}>
          Visningsnamn
          <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={{ marginTop: 4 }} />
        </label>
        <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          Färg på din häst
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <button className="btn btn-accent" onClick={saveProfile} disabled={busy}>Spara</button>
      </div>
      {msg && <p style={{ marginTop: 10, fontWeight: 700 }}>{msg}</p>}
    </div>
  );
}

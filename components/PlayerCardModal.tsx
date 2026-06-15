'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from './Avatar';
import { Flag } from './Flag';

export interface PlayerSeed {
  userId: string;
  displayName: string;
  color: string;
  avatarUrl: string | null;
}

interface PlayerCard extends PlayerSeed {
  rank: number | null;
  totalPoints: number;
  nextMatch: { homeLabel: string; awayLabel: string; kickoff: string } | null;
  nextPick: '1' | 'X' | '2' | null;
  revealed: boolean;
}

function pickLabel(pick: '1' | 'X' | '2', m: { homeLabel: string; awayLabel: string }) {
  if (pick === '1') return `${m.homeLabel} vinner`;
  if (pick === '2') return `${m.awayLabel} vinner`;
  return 'Oavgjort';
}

function kickoffLabel(iso: string) {
  const s = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function PlayerCardModal({ seed, onClose }: { seed: PlayerSeed; onClose: () => void }) {
  const [card, setCard] = useState<PlayerCard | null>(null);
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Fetch the full card; the seed already gives us name/avatar so the header
  // renders instantly while the stats load.
  useEffect(() => {
    let active = true;
    setCard(null);
    setError(false);
    fetch(`/api/players/${seed.userId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load failed'))))
      .then((d) => active && setCard(d.card))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [seed.userId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!mounted) return null;

  const next = card?.nextMatch ?? null;

  return createPortal(
    <div className="pc-backdrop" onClick={onClose} role="presentation">
      <div className="pc-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${seed.displayName}s profil`}>
        <button className="pc-close" onClick={onClose} aria-label="Stäng">×</button>

        <div className="pc-head">
          <Avatar name={seed.displayName} color={seed.color} avatarUrl={seed.avatarUrl} size={96} className="pc-ava" />
          <div className="pc-name">{seed.displayName}</div>
          {card?.rank != null && (
            <div className="pc-rank">{card.rank}:a plats</div>
          )}
        </div>

        {error ? (
          <p className="empty" style={{ textAlign: 'center' }}>Kunde inte ladda profilen.</p>
        ) : (
          <>
            <div className="pc-points">
              <b>{card ? card.totalPoints : '–'}</b>
              <span>poäng</span>
            </div>

            <div className="pc-next">
              <div className="pc-next-h">Nästa match</div>
              {!card && <div className="muted">Laddar…</div>}
              {card && !next && <div className="muted">Inga fler matcher.</div>}
              {card && next && (
                <>
                  <div className="pc-next-match">
                    <Flag team={next.homeLabel} />{next.homeLabel}
                    <i> – </i>
                    {next.awayLabel}<Flag team={next.awayLabel} />
                  </div>
                  <div className="pc-next-time">{kickoffLabel(next.kickoff)}</div>
                  <div className="pc-next-pick">
                    {!card.revealed
                      ? 'Tips avslöjas vid avspark'
                      : card.nextPick
                        ? `Tippat: ${pickLabel(card.nextPick, next)}`
                        : 'Ingen tippning'}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

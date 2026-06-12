'use client';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { PlayerCardModal, type PlayerSeed } from './PlayerCardModal';

interface PlayerCardCtx {
  open: (seed: PlayerSeed) => void;
}

const Ctx = createContext<PlayerCardCtx | null>(null);

export function usePlayerCard(): PlayerCardCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePlayerCard måste användas inom PlayerCardProvider');
  return ctx;
}

/**
 * Holds the single mini-profile modal for the whole app. Any ClickableAvatar
 * calls `open(seed)` to show it; only one modal exists at a time.
 */
export function PlayerCardProvider({ children }: { children: ReactNode }) {
  const [seed, setSeed] = useState<PlayerSeed | null>(null);
  const open = useCallback((s: PlayerSeed) => setSeed(s), []);
  const close = useCallback(() => setSeed(null), []);

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {seed && <PlayerCardModal seed={seed} onClose={close} />}
    </Ctx.Provider>
  );
}

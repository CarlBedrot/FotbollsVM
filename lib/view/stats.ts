import type { StandingView } from './standingsView';

export interface Stat {
  key: string;
  label: string;
  value: string;
  who: string;
  emoji: string;
}

function top<T>(items: StandingView[], by: (s: StandingView) => number): StandingView | null {
  if (items.length === 0) return null;
  return [...items].sort((a, b) => by(b) - by(a))[0];
}

export function computeStats(views: StandingView[]): Stat[] {
  if (views.length === 0) return [];
  const leader = top(views, (s) => -s.rank)!; // rank 1 → highest -rank
  const best = top(views, (s) => s.matchPoints)!;
  const climber = top(views, (s) => (s.prevRank ?? s.rank) - s.rank)!;
  const bonus = top(views, (s) => s.bonusPoints)!;
  const climb = (climber.prevRank ?? climber.rank) - climber.rank;
  return [
    { key: 'leader', label: 'Leder loppet', value: `${leader.totalPoints} p`, who: leader.displayName, emoji: '👑' },
    { key: 'bestResults', label: 'Bäst på resultat', value: `${best.matchPoints} rätt`, who: best.displayName, emoji: '🎯' },
    { key: 'climber', label: 'Dagens klättrare', value: climb > 0 ? `+${climb} placeringar` : 'står still', who: climber.displayName, emoji: '🚀' },
    { key: 'mostBonus', label: 'Mest bonuspoäng', value: `${bonus.bonusPoints} p`, who: bonus.displayName, emoji: '⭐' },
  ];
}

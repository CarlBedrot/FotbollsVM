import { Flag } from './Flag';
import { Avatar } from './Avatar';
import type { PlayerTips } from '@/lib/view/allTips';
import type { Pick } from '@/lib/domain/types';
import { verdict, flattenMatches } from '@/lib/view/tipsCompare';

function shortDate(iso: string) {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)}/${Number(m)}`;
}

function BonusRow({ label, team }: { label: string; team: string | null }) {
  return (
    <div className="mt-bonus-row">
      <span className="muted">{label}</span>
      <span className="mt-bonus-team">{team ? <><Flag team={team} /> {team}</> : '—'}</span>
    </div>
  );
}

/**
 * One player's full tip sheet — bonus picks + all match tips. Match chips are
 * coloured right/wrong against the result. When `me` is given (i.e. this is
 * someone else's sheet), each match is flagged same/different vs my own pick.
 */
export function PlayerSheet({ player, outcomes, me }: { player: PlayerTips; outcomes: Record<string, Pick>; me: PlayerTips | null }) {
  const tips = player.tips;
  const myById = me ? new Map(flattenMatches(me.tips).map((m) => [m.id, m.pick])) : null;

  return (
    <div className="stack">
      <div className="card sec ps-card">
        <div className="ps-head">
          <Avatar name={player.displayName} color={player.color} avatarUrl={player.avatarUrl} size={44} />
          <div>
            <div className="ps-name">{player.displayName}</div>
            <div className="cap">{tips.pickCount}/72 matchtips · {tips.bonusCount}/18 bonustips</div>
          </div>
        </div>
        <div className="mt-bonus">
          <BonusRow label="VM-vinnare (16 p)" team={tips.champion} />
          <BonusRow label="Finalist (8 p)" team={tips.finalist1} />
          <BonusRow label="Finalist (8 p)" team={tips.finalist2} />
          <BonusRow label="Brons (8 p)" team={tips.bronze} />
          <BonusRow label="Flest mål (4 p)" team={tips.mostGoals} />
          <BonusRow label="Färst mål (4 p)" team={tips.fewestGoals} />
        </div>
        <div className="mt-group-h" style={{ marginTop: 14 }}>Gruppvinnare (4 p/grupp)</div>
        <div className="mt-winners">
          {tips.groupWinners.map((w) => (
            <span key={w.group} className="mt-winner">
              <b>{w.group}</b> {w.teamName ? <><Flag team={w.teamName} /> {w.teamName}</> : '—'}
            </span>
          ))}
        </div>
      </div>

      <div className="card sec ps-card">
        <div className="mt-groups">
          {tips.groups.map((g) => (
            <div className="mt-group" key={g.group}>
              <div className="mt-group-h">Grupp {g.group}</div>
              {g.matches.map((m) => {
                const v = verdict(m.pick, outcomes[m.id]);
                const mine = myById?.get(m.id) ?? null;
                const diff = myById && m.pick !== null && mine !== null ? (m.pick === mine ? 'same' : 'diff') : null;
                return (
                  <div className="mt-row" key={m.id}>
                    <div className="mt-match">
                      <span className="mt-date">{shortDate(m.kickoff)}</span>
                      <Flag team={m.homeLabel} /> {m.homeLabel} – {m.awayLabel} <Flag team={m.awayLabel} />
                    </div>
                    <span className="ps-cell">
                      {diff && <span className={`ps-diff ${diff}`}>{diff === 'same' ? '✓' : '●'}</span>}
                      <span className={`pick-chip v-${v}${m.pick ? '' : ' missing'}`}>{m.pick ?? '?'}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

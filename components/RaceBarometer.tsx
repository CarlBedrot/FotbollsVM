import { Avatar } from './Avatar';
import { progressPercent } from '@/lib/view/barometer';
import type { StandingView } from '@/lib/view/standingsView';

export function RaceBarometer({ standings }: { standings: StandingView[] }) {
  return (
    <section className="card hero">
      <div className="hero-head">
        <div className="t">
          <span className="dot" />
          <h2>Loppet</h2>
        </div>
        <div className="meta">Mål 168p</div>
      </div>
      <div className="track">
        {standings.length === 0 && <p className="empty">Inga tips ännu — loppet börjar när gänget laddat upp.</p>}
        {standings.length > 0 && (
          <>
            <div className="finish" />
            <div className="finlabel">168</div>
            {standings.map((s) => {
              const frac = progressPercent(s.totalPoints) / 92; // 0..1 of the rail
              return (
                <div key={s.userId} className="lane">
                  <div className="laneName">
                    <span className="rank-badge">{s.rank}</span>
                    {s.displayName}
                  </div>
                  <div className="rail" />
                  <div className="runner" style={{ left: `calc(108px + (100% - 156px) * ${frac})` }}>
                    <Avatar name={s.displayName} color={s.color} avatarUrl={s.avatarUrl} size={34} lead={s.rank === 1} />
                    <span className="pts">{s.totalPoints}</span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}

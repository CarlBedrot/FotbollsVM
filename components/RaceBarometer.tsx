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
        {standings.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '14px 0 18px' }}>
            <svg viewBox="0 0 460 150" width="100%" style={{ maxWidth: 460, height: 'auto' }} role="img" aria-label="Startlinje för loppet">
              <rect x="8" y="18" width="444" height="114" rx="14" fill="#11161f" stroke="#242c3b" />
              <line x1="22" y1="51" x2="438" y2="51" stroke="#242c3b" strokeWidth="2" strokeDasharray="6 9" />
              <line x1="22" y1="75" x2="438" y2="75" stroke="#242c3b" strokeWidth="2" strokeDasharray="6 9" />
              <line x1="22" y1="99" x2="438" y2="99" stroke="#242c3b" strokeWidth="2" strokeDasharray="6 9" />
              {/* runners waiting at the start */}
              <circle cx="48" cy="51" r="10" fill="#2b3346" stroke="#3a4256" strokeWidth="2" />
              <circle cx="48" cy="75" r="10" fill="#2b3346" stroke="#3ee089" strokeWidth="2" />
              <circle cx="48" cy="99" r="10" fill="#2b3346" stroke="#3a4256" strokeWidth="2" />
              {/* football */}
              <circle cx="84" cy="120" r="9" fill="#eef2f9" stroke="#0b0f17" strokeWidth="1.5" />
              <path d="M84 113 l5 4 -2 6 -6 0 -2 -6 z" fill="#0b0f17" />
              {/* finish flag */}
              <g transform="translate(418,20)">
                <rect x="0" y="0" width="3" height="112" fill="#8a93a6" />
                <g transform="translate(4,4)">
                  <rect width="32" height="24" fill="#0b0f17" />
                  <rect x="0" y="0" width="8" height="8" fill="#eef2f9" /><rect x="16" y="0" width="8" height="8" fill="#eef2f9" />
                  <rect x="8" y="8" width="8" height="8" fill="#eef2f9" /><rect x="24" y="8" width="8" height="8" fill="#eef2f9" />
                  <rect x="0" y="16" width="8" height="8" fill="#eef2f9" /><rect x="16" y="16" width="8" height="8" fill="#eef2f9" />
                </g>
              </g>
            </svg>
            <p className="empty" style={{ padding: 0, textAlign: 'center' }}>Loppet startar när gänget laddat upp sina tips.</p>
          </div>
        )}
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

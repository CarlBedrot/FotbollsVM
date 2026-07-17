import { RaceTrack } from './RaceTrack';
import { RaceLanes } from './RaceLanes';
import { MAX_POINTS } from '@/lib/domain/rules';
import type { StandingView } from '@/lib/view/standingsView';

export function RaceBarometer({ standings }: { standings: StandingView[] }) {
  return (
    <section className="card hero">
      <div className="hero-head">
        <h2>Loppet</h2>
        <div className="note">anfall mot {MAX_POINTS}!</div>
      </div>
      <div className="track">
        {standings.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '14px 0 18px' }}>
            <svg viewBox="0 0 300 210" width="100%" style={{ maxWidth: 300, height: 'auto' }} role="img" aria-label="Taktiktavlan väntar på tips">
              {/* chalk pitch, attacking upwards */}
              <rect x="10" y="10" width="280" height="190" rx="4" fill="none" stroke="currentColor" strokeWidth="2" opacity=".55" />
              <line x1="10" y1="105" x2="290" y2="105" stroke="currentColor" strokeWidth="2" opacity=".3" />
              <circle cx="150" cy="105" r="26" fill="none" stroke="currentColor" strokeWidth="2" opacity=".3" />
              {/* penalty box + goal at the top */}
              <rect x="85" y="10" width="130" height="34" fill="none" stroke="currentColor" strokeWidth="2" opacity=".3" />
              <rect x="120" y="10" width="60" height="14" fill="none" stroke="currentColor" strokeWidth="2" opacity=".55" />
              {/* magnets waiting in the own half */}
              <circle cx="110" cy="172" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" opacity=".75" strokeDasharray="3 4" />
              <circle cx="150" cy="180" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" opacity=".75" />
              <circle cx="190" cy="172" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" opacity=".75" strokeDasharray="3 4" />
              {/* chalk arrow up the pitch */}
              <line x1="150" y1="162" x2="150" y2="60" stroke="currentColor" strokeWidth="2" opacity=".45" strokeDasharray="6 8" />
              <path d="M150 52 l-7 12 h14 z" fill="currentColor" opacity=".45" />
            </svg>
            <p className="empty" style={{ padding: 0, textAlign: 'center' }}>Loppet startar när gänget laddat upp sina tips.</p>
          </div>
        )}
        {standings.length > 0 && (
          <>
            {/* Taktiktavla på desktop, horisontella banor på mobil — CSS växlar (max-width 560px). */}
            <div className="loppet-board"><RaceTrack standings={standings} /></div>
            <div className="loppet-lanes"><RaceLanes standings={standings} /></div>
          </>
        )}
      </div>
    </section>
  );
}

import { Card, SectionHeader } from './Card';
import { ClickableAvatar } from './ClickableAvatar';
import { Flag } from './Flag';
import { OUTCOMES, type DailyOverview, type MatchOverview } from '@/lib/view/dailyPredictions';

const TZ = 'Europe/Stockholm';

function time(iso: string) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
function longDay(dayKey: string) {
  // Anchor at noon UTC so the date never rolls across the Stockholm TZ boundary
  // when reconstructing a Date from the bare YYYY-MM-DD day key.
  const d = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(`${dayKey}T12:00:00Z`));
  return d.charAt(0).toUpperCase() + d.slice(1);
}
function outcomeLabel(o: string, m: MatchOverview) {
  if (o === '1') return m.homeLabel;
  if (o === '2') return m.awayLabel;
  return 'Oavgjort';
}

export function DailyPredictions({ overview }: { overview: DailyOverview }) {
  if (overview.matches.length === 0) return null;

  return (
    <Card>
      <SectionHeader title="Vad tror alla idag?" caption={longDay(overview.todayKey)} />

      {!overview.revealed && (
        <p className="muted" style={{ fontSize: 13, marginTop: -4 }}>
          Allas tips avslöjas när tipsen låses (vid första avspark).
        </p>
      )}

      {overview.matches.map((m) => {
        return (
          <div key={m.matchId} className="pred">
            <div className="pred-top">
              <span className="pred-time">{time(m.kickoff)}</span>
              <span className="pred-vs">
                <Flag team={m.homeLabel} />{m.homeLabel}
                <i>–</i>
                {m.awayLabel}<Flag team={m.awayLabel} />
              </span>
              <span className="pred-n">{m.total} tippat</span>
            </div>

            {overview.revealed && m.counts && m.voters && (
              <div className="pred-grid">
                {OUTCOMES.map((o) => (
                  <div key={o} className="pred-opt">
                    <div className="pred-opt-h">
                      <b>{o}</b>
                      <span>{outcomeLabel(o, m)}</span>
                      <em>{m.counts![o]}</em>
                    </div>
                    <div className="pred-faces">
                      {m.voters![o].map((v) => (
                        <ClickableAvatar key={v.userId} userId={v.userId} name={v.name} color={v.color} avatarUrl={v.avatarUrl} size={22} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}

import { Card, SectionHeader } from './Card';
import type { MatchView } from '@/lib/view/matchView';
import { Flag } from './Flag';

// Alla tider visas i svensk tid (CET/CEST) — gänget tittar från Sverige även om VM spelas i Nordamerika.
const TZ = 'Europe/Stockholm';
const dayFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'long' });
const dayKeyFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

function dayKey(iso: string) {
  return dayKeyFmt.format(new Date(iso));
}
function dayLabel(iso: string) {
  return dayFmt.format(new Date(iso)); // t.ex. "tors 11 juni"
}
function clockTime(iso: string) {
  return timeFmt.format(new Date(iso)); // t.ex. "21:00"
}

interface DayGroup {
  key: string;
  label: string;
  items: MatchView[];
}

// Bryt den (redan kronologiskt sorterade) listan i dagsgrupper för datum-rubriker.
function groupByDay(matches: MatchView[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const m of matches) {
    const key = dayKey(m.kickoff);
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) {
      groups.push({ key, label: dayLabel(m.kickoff), items: [m] });
    } else {
      last.items.push(m);
    }
  }
  return groups;
}

export function MatchList({ matches, title = 'Matcher', caption }: { matches: MatchView[]; title?: string; caption?: string }) {
  const days = groupByDay(matches);
  return (
    <Card>
      <SectionHeader title={title} caption={caption} />
      {matches.length === 0 && <p className="empty">Inga matcher inlästa ännu.</p>}
      {days.map((day) => (
        <div key={day.key} className="match-day">
          <div className="match-day-head">{day.label}</div>
          {day.items.map((m) => {
            const played = m.status === 'finished' || m.status === 'live';
            return (
              <div key={m.id} className="match">
                <div className="team a">
                  {m.homeLabel}<Flag team={m.homeLabel} />
                </div>
                <div className={`res ${m.status === 'live' ? 'live' : played ? '' : 'sched'}`.trim()}>
                  {played ? `${m.homeScore}–${m.awayScore}` : clockTime(m.kickoff)}
                </div>
                <div className="team">
                  <Flag team={m.awayLabel} />{m.awayLabel}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </Card>
  );
}

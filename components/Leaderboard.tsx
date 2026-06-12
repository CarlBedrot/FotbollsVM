import { ClickableAvatar } from "./ClickableAvatar";
import { Card, SectionHeader } from "./Card";
import type { StandingView } from "@/lib/view/standingsView";
import { MAX_POINTS } from "@/lib/domain/rules";

export function Leaderboard({
  standings,
  limit,
}: {
  standings: StandingView[];
  limit?: number;
}) {
  const rows = limit ? standings.slice(0, limit) : standings;
  return (
    <Card>
      <SectionHeader title="Ställning" caption={`Poäng av ${MAX_POINTS}`} />
      {rows.length === 0 && <p className="empty">Inga tips ännu.</p>}
      {rows.map((s) => (
        <div key={s.userId} className="row">
          <div className={`pos ${s.rank <= 3 ? `p${s.rank}` : ""}`.trim()}>
            {s.rank}
          </div>
          <ClickableAvatar
            userId={s.userId}
            name={s.displayName}
            color={s.color}
            avatarUrl={s.avatarUrl}
            size={30}
            className="mini"
          />
          <div>
            <div className="nm">{s.displayName}</div>
          </div>
          <div className="score">
            <b>{s.totalPoints}</b>
            <span>av {MAX_POINTS}</span>
          </div>
        </div>
      ))}
    </Card>
  );
}

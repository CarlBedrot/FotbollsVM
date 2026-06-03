import { Avatar } from './Avatar';
import { progressPercent } from '@/lib/view/barometer';
import type { StandingView } from '@/lib/view/standingsView';

export function RaceBarometer({ standings }: { standings: StandingView[] }) {
  return (
    <div className="retro-card overflow-hidden p-0">
      <div className="flex items-center justify-between px-5 py-4 border-b-[3px] border-ink"
           style={{ background: 'repeating-linear-gradient(45deg,#e23b3b 0 14px,#cf3030 14px 28px)' }}>
        <h2 className="anton text-white text-3xl m-0" style={{ textShadow: '3px 3px 0 #1c1c22' }}>🏇 LOPPET</h2>
        <span className="text-white text-xs font-extrabold uppercase tracking-wider bg-ink px-2.5 py-1.5 rounded-full">Mål: 168p</span>
      </div>
      <div className="relative px-4 pt-4 pb-2">
        {standings.length === 0 && <p className="text-center py-10 font-bold opacity-60">Inga tips ännu — loppet börjar när gänget laddat upp.</p>}
        {standings.map((s) => (
          <div key={s.userId} className="relative h-[52px] mr-[60px]">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded bg-[#efe4cc] border-y-2 border-[#d9cba7]" />
            <span className="absolute left-0 top-1/2 -translate-y-1/2 z-10 text-[11px] font-extrabold uppercase tracking-wide bg-cream border-2 border-ink rounded-full px-1.5 py-0.5">
              {s.displayName}
            </span>
            <div className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-0.5" style={{ left: `${progressPercent(s.totalPoints)}%` }}>
              {s.rank === 1 && <span className="text-base leading-none">👑</span>}
              <Avatar name={s.displayName} color={s.color} avatarUrl={s.avatarUrl} size={42} />
              <span className="text-[11px] font-extrabold bg-white border-2 border-ink rounded-full px-1.5" style={{ boxShadow: '1.5px 1.5px 0 #1c1c22' }}>{s.totalPoints}p</span>
            </div>
          </div>
        ))}
        <div className="absolute top-3.5 bottom-8 right-[54px] w-4 border-[2.5px] border-ink rounded"
             style={{ background: 'repeating-linear-gradient(0deg,#1c1c22 0 8px,#fff 8px 16px)' }} />
      </div>
    </div>
  );
}

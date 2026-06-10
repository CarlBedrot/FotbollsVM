import { flagCodeFor } from '@/lib/view/flags';

// One team per pennant — a spread across the WC2026 field that reads "VM" at a glance.
const TEAMS = [
  'Mexico', 'Canada', 'USA', 'Brazil', 'Argentina', 'France', 'Germany', 'Spain',
  'England', 'Portugal', 'Netherlands', 'Japan', 'South Korea', 'Morocco', 'Sweden', 'Switzerland',
];

/** Flag garland hanging from a chalk line under the header. */
export function Bunting() {
  return (
    <div className="bunting" aria-hidden="true">
      {TEAMS.map((t) => {
        const code = flagCodeFor(t);
        if (!code) return null;
        return (
          <span key={t} className="pennant">
            <img src={`https://flagcdn.com/w80/${code}.png`} alt="" loading="lazy" />
          </span>
        );
      })}
    </div>
  );
}

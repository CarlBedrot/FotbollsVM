/** Skelettplatshållare som visas direkt vid flikbyte medan serverdatan streamas
 *  in — appen känns responsiv istället för att frysa på gamla sidan. Rent
 *  dekorativt: aria-hidden så skärmläsare hoppar över det. */

export function SkeletonCard({
  rows = 4,
  title = true,
  className = "",
}: {
  rows?: number;
  title?: boolean;
  className?: string;
}) {
  return (
    <section className={`card sec sk ${className}`.trim()} aria-hidden="true">
      {title && <div className="sk-bar sk-title" />}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="sk-bar sk-row" />
      ))}
    </section>
  );
}

export function SkeletonStatGrid({ cells = 4 }: { cells?: number }) {
  return (
    <div className="sk-grid" aria-hidden="true">
      {Array.from({ length: cells }).map((_, i) => (
        <div key={i} className="card sec sk sk-stat">
          <div className="sk-bar sk-stat-num" />
          <div className="sk-bar sk-stat-label" />
        </div>
      ))}
    </div>
  );
}

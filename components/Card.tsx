import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`retro-card p-4 ${className}`}>{children}</div>;
}

export function SectionHeader({ pill, pillColor, title }: { pill: string; pillColor: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3.5">
      <span className="retro-pill" style={{ background: pillColor, boxShadow: '2px 2px 0 #1c1c22' }}>{pill}</span>
      <h3 className="anton text-2xl m-0">{title}</h3>
    </div>
  );
}

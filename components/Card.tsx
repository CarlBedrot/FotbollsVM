import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card sec ${className}`.trim()}>{children}</section>;
}

export function SectionHeader({ title, caption }: { title: string; caption?: string }) {
  return (
    <>
      <h3>{title}</h3>
      {caption && <div className="cap">{caption}</div>}
    </>
  );
}

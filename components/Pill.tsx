export function Pill({ children, color = '#1c1c22' }: { children: React.ReactNode; color?: string }) {
  return <span className="retro-pill" style={{ background: color, boxShadow: '2px 2px 0 #1c1c22' }}>{children}</span>;
}

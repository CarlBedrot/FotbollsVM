export function Avatar({
  name,
  color,
  avatarUrl,
  size = 34,
  lead = false,
  className = '',
}: {
  name: string;
  color: string;
  avatarUrl: string | null;
  size?: number;
  lead?: boolean;
  className?: string;
}) {
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const cls = `ava ${lead ? 'lead' : ''} ${className}`.trim();
  const dims = { width: size, height: size };
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={cls} style={dims} />;
  }
  return (
    <span className={cls} style={{ ...dims, background: color, fontSize: size * 0.38 }}>
      {initials}
    </span>
  );
}

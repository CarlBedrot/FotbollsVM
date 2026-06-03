export function Avatar({ name, color, avatarUrl, size = 40 }: { name: string; color: string; avatarUrl: string | null; size?: number }) {
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const style = { width: size, height: size, borderWidth: 3, boxShadow: '3px 3px 0 #1c1c22' };
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className="rounded-full border-ink object-cover" style={style} />;
  }
  return (
    <span
      className="rounded-full border-ink text-white font-extrabold flex items-center justify-center"
      style={{ ...style, background: color, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}

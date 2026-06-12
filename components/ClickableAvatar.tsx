'use client';
import { Avatar } from './Avatar';
import { usePlayerCard } from './PlayerCardProvider';

/**
 * An Avatar that opens the player's mini-profile card on click. Drop-in for
 * <Avatar> wherever the avatar represents a player (standings, race, votes).
 */
export function ClickableAvatar({
  userId,
  name,
  color,
  avatarUrl,
  size,
  lead,
  className,
}: {
  userId: string;
  name: string;
  color: string;
  avatarUrl: string | null;
  size?: number;
  lead?: boolean;
  className?: string;
}) {
  const { open } = usePlayerCard();
  return (
    <button
      type="button"
      className="avatar-btn"
      onClick={() => open({ userId, displayName: name, color, avatarUrl })}
      aria-label={`Visa ${name}s profil`}
    >
      <Avatar name={name} color={color} avatarUrl={avatarUrl} size={size} lead={lead} className={className} />
    </button>
  );
}

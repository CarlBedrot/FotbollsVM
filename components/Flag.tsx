import { flagCodeFor } from '@/lib/view/flags';

/**
 * Image-based flag (flagcdn.com). Emoji flags render as plain letter pairs on
 * Windows, so images are the only way the flags actually show for everyone.
 */
export function Flag({ team, className = 'fimg' }: { team: string; className?: string }) {
  const code = flagCodeFor(team);
  if (!code) return null;
  return (
    <img
      className={className}
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      alt={team}
      loading="lazy"
    />
  );
}

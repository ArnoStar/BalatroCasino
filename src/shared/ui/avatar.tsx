import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { avatar_url, avatar_versions } from '@/shared/api';

/** a hue for a name or id: the same player always gets the same colours */
export function hue_of(s: string): number {
  let h = 7;
  for (const c of s) h = (Math.imul(h, 31) + (c.codePointAt(0) ?? 0)) >>> 0;
  return h % 360;
}

/** "Lucky Seven" → "LS", "naneinf_hunter" → "N" */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => [...w][0] ?? '').join('').toUpperCase() || '?';
}

/**
 * A player's profile picture (looked up with the others on the page: the
 * social service's), or their initials on their own gradient (also while the
 * picture loads, or if it can't). `ring`: a colour around it (the player's in
 * a game). Decorative: the name is always written next to it.
 */
export function Avatar({ name, player, size = 'md', ring, className }: {
  name: string | null | undefined;
  player?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  ring?: string;
  className?: string;
}) {
  const n = name ?? '?';
  const version = useSyncExternalStore(avatar_versions.subscribe, () => (player ? avatar_versions.peek(player) : null));
  useEffect(() => {
    if (player) avatar_versions.want(player);
  }, [player]);
  const picture = player ? avatar_url(player, version) : null;
  const [failed, setFailed] = useState<string | null>(null);
  const style = { '--h': hue_of(player ?? n), ...(ring ? { '--ring': ring } : {}) } as CSSProperties;
  return (
    <span className={['avatar', `avatar--${size}`, ring && 'avatar--ring', className].filter(Boolean).join(' ')} style={style} aria-hidden>
      {initials(n)}
      {picture && failed !== picture ? (
        <img className="avatar__img" src={picture} alt="" loading="lazy" decoding="async" onError={() => setFailed(picture)} />
      ) : null}
    </span>
  );
}

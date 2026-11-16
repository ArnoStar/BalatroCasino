// The social service (BalatroSocial): the friends a player can challenge, and
// everyone's profile picture.
import { SOCIAL_BASE } from '@/shared/config';
import { read_json } from './problem';
import { authorized_fetch } from './session';

export interface Friend {
  id: string;
  name: string | null;
  /** their profile picture's version (null: none) */
  avatar: number | null;
  presence: { online: boolean } | null;
}

const url = (path: string) => `${SOCIAL_BASE}${path}`;
const id = encodeURIComponent;

/** a player's profile picture, for an <img> (null: they have none: their initials) */
export const avatar_url = (player: string, version: number | null | undefined) =>
  version ? `${SOCIAL_BASE}/v1/avatars/${id(player)}?v=${version}` : null;

/**
 * Any player's profile picture version (the social service's public
 * `GET /v1/avatars?ids=`): asked for together (a page of names makes one
 * request), kept for the page's life. `undefined`: not known yet; null: none.
 */
export const avatar_versions = (() => {
  const known = new Map<string, number | null>();
  const wanted = new Set<string>();
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  async function ask() {
    timer = null;
    const ids = [...wanted].filter((i) => !known.has(i));
    wanted.clear();
    for (let i = 0; i < ids.length; i += 100) {
      const part = ids.slice(i, i + 100);
      let got: Record<string, number | null> = {};
      try {
        const r = await fetch(url(`/v1/avatars?ids=${part.map(id).join(',')}`));
        if (r.ok) got = await r.json();
      } catch {
        // (no service: everyone shows their initials)
      }
      for (const p of part) if (!known.has(p)) known.set(p, got[p] ?? null);
    }
    for (const l of listeners) l();
  }
  return {
    peek: (player: string) => known.get(player),
    /** looks it up (with the others asked for in the same moment) */
    want(player: string) {
      if (!player || known.has(player) || wanted.has(player)) return;
      wanted.add(player);
      timer ??= setTimeout(ask, 20);
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
})();

export const social_api = {
  /** the player's friends (they may be challenged) */
  friends: () => authorized_fetch(url('/v1/friends')).then((r) => read_json<Friend[]>(r)),
};

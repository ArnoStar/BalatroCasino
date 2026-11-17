// Items by the game's own names in the player's language: the game serves its
// translations (/play/localization/<language>.json); English is the item
// service's. Loaded once, when a language other than English is first shown.
import { useEffect, useState } from 'react';
import type { Item } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { LANGUAGES, useI18n } from '@/shared/i18n';

type Names = Record<string, string>;

const loaded = new Map<string, Promise<Names>>();

function load(game_key: string): Promise<Names> {
  let p = loaded.get(game_key);
  if (!p) {
    p = fetch(`${GAME_URL}/localization/${game_key}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((text: { descriptions?: Record<string, Record<string, { name?: string }>> } | null) => {
        const out: Names = {};
        for (const set of ['Joker', 'Tag'] as const) {
          for (const [key, d] of Object.entries(text?.descriptions?.[set] ?? {})) if (d?.name) out[key] = d.name;
        }
        return out;
      })
      .catch(() => ({}));
    loaded.set(game_key, p);
  }
  return p;
}

/** an item's name in the player's language (the game's), else the service's */
export function useItemName(): (item: Pick<Item, 'key' | 'name'>) => string {
  const { lang } = useI18n();
  const game_key = LANGUAGES.find((l) => l.code === lang)?.game ?? 'en-us';
  const [names, setNames] = useState<{ key: string; names: Names } | null>(null);
  useEffect(() => {
    if (game_key === 'en-us') return;
    let live = true;
    void load(game_key).then((n) => live && setNames({ key: game_key, names: n }));
    return () => {
      live = false;
    };
  }, [game_key]);
  const current = names?.key === game_key ? names.names : null;
  return (item) => current?.[item.key] ?? item.name;
}

// Items by the game's own names in the player's language: the game serves its
// translations (/play/localization/<language>.json); English is the item
// service's. A playing card is its rank and suit. Loaded once, when a
// language other than English is first shown.
import { useEffect, useState } from 'react';
import type { Item } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { LANGUAGES, useI18n } from '@/shared/i18n';

type Names = Record<string, string>;
type Text = {
  descriptions?: Record<string, Record<string, { name?: string }>>;
  misc?: { ranks?: Record<string, string>; suits_plural?: Record<string, string> };
};

// a playing card's key: its suit's letter and its rank's (S_A: the Ace of Spades)
const SUITS: Record<string, string> = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
const RANKS: Record<string, string> = { T: '10', J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace' };

const loaded = new Map<string, Promise<Names>>();

function load(game_key: string): Promise<Names> {
  let p = loaded.get(game_key);
  if (!p) {
    p = fetch(`${GAME_URL}/localization/${game_key}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((text: Text | null) => {
        const out: Names = {};
        for (const set of ['Joker', 'Tarot', 'Planet', 'Spectral'] as const) {
          for (const [key, d] of Object.entries(text?.descriptions?.[set] ?? {})) if (d?.name) out[key] = d.name;
        }
        for (const [k, v] of Object.entries(text?.misc?.ranks ?? {})) out[`rank:${k}`] = v;
        for (const [k, v] of Object.entries(text?.misc?.suits_plural ?? {})) out[`suit:${k}`] = v;
        return out;
      })
      .catch(() => ({}));
    loaded.set(game_key, p);
  }
  return p;
}

/** an item's name in the player's language (the game's), else the service's */
export function useItemName(): (item: Pick<Item, 'key' | 'name' | 'kind'>) => string {
  const { lang, t } = useI18n();
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
  return (item) => {
    if (item.kind === 'card') {
      const [suit, rank] = item.key.split('_');
      const english = { rank: RANKS[rank ?? ''] ?? rank ?? '', suit: SUITS[suit ?? ''] ?? '' };
      if (!current || !english.suit) return item.name;
      return t.items.card_name(current[`rank:${english.rank}`] ?? english.rank, current[`suit:${english.suit}`] ?? english.suit);
    }
    return current?.[item.key] ?? item.name;
  };
}

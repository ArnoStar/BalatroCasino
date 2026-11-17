// The player's items that can be staked, to pick from: sorted by value (or
// newest, or rarest), only jokers or tags, found by name. Each shows its value;
// the picked ones are lit, in the order they were picked.
import { useMemo, useState, type CSSProperties } from 'react';
import { ItemArt, useItemName } from '@/entities/item';
import type { Item } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Icon, Segmented, Value } from '@/shared/ui';

type Sort = 'value' | 'newest' | 'rarity';
type Kind = 'all' | 'joker' | 'tag';

export function ItemPicker({ items, held, picked, onChange, max }: {
  /** the items that can be staked */
  items: Item[];
  /** how many of the player's items can't be staked now */
  held: number;
  picked: string[];
  onChange: (picked: string[]) => void;
  max: number;
}) {
  const { t } = useI18n();
  const name = useItemName();
  const [sort, setSort] = useState<Sort>('value');
  const [kind, setKind] = useState<Kind>('all');
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = items.filter((i) => (kind === 'all' || i.kind === kind) && (!query || name(i).toLowerCase().includes(query) || i.name.toLowerCase().includes(query)));
    const by: Record<Sort, (a: Item, b: Item) => number> = {
      value: (a, b) => b.odds - a.odds,
      newest: (a, b) => b.acquired_at.localeCompare(a.acquired_at),
      rarity: (a, b) => b.rarity - a.rarity || b.odds - a.odds,
    };
    return [...list].sort((a, b) => by[sort](a, b) || a.id.localeCompare(b.id));
  }, [items, kind, q, sort, name]);

  const toggle = (id: string) =>
    onChange(picked.includes(id) ? picked.filter((x) => x !== id) : picked.length < max ? [...picked, id] : picked);

  if (!items.length) {
    return (
      <div className="picker picker--empty">
        <p className="picker__none">
          <Icon name="cards" /> {t.stake.none}
        </p>
        {held ? <p className="muted">{t.stake.held(held)}</p> : null}
      </div>
    );
  }
  return (
    <div className="picker">
      <div className="picker__tools">
        <label className="picker__search">
          <Icon name="search" />
          <span className="visually-hidden">{t.stake.search}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.stake.search} autoComplete="off" />
        </label>
        <Segmented
          label={t.stake.your_items}
          value={kind}
          onChange={setKind}
          options={[
            ['all', t.stake.all],
            ['joker', t.stake.jokers],
            ['tag', t.stake.tags],
          ]}
        />
        <label className="picker__sort">
          <span className="visually-hidden">{t.filters.sort}</span>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="value">{t.stake.sort_value}</option>
            <option value="rarity">{t.stake.sort_rarity}</option>
            <option value="newest">{t.stake.sort_newest}</option>
          </select>
        </label>
      </div>
      <ul className="picker__grid">
        {shown.map((it, n) => {
          const order = picked.indexOf(it.id);
          const on = order >= 0;
          return (
            <li key={it.id} style={{ '--i': Math.min(n, 30) } as CSSProperties}>
              <button
                type="button"
                className={`pick pick--r${it.rarity} pick--${it.edition}${on ? ' pick--on' : ''}`}
                aria-pressed={on}
                disabled={!on && picked.length >= max}
                onClick={() => toggle(it.id)}
                title={`${name(it)} · ${t.items.rarity[it.rarity]}${it.edition !== 'base' ? ` · ${t.items.edition[it.edition]}` : ''}`}
              >
                {on ? <span className="pick__order">{order + 1}</span> : null}
                <span className="pick__art">
                  <ItemArt item={it} scale={0.78} />
                </span>
                <span className="pick__name">{name(it)}</span>
                <Value value={it.odds} size="sm" compact />
              </button>
            </li>
          );
        })}
      </ul>
      {held ? <p className="muted picker__held">{t.stake.held(held)}</p> : null}
    </div>
  );
}

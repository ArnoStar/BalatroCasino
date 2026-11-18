import type { CSSProperties } from 'react';
import type { Item } from '@/shared/api';
import { portal } from '@/shared/config';
import { useI18n } from '@/shared/i18n';
import { useItemName } from '../model/names';
import { ItemArt } from './item-art';

/** an item in a row of a game: its picture (a link to its page on the portal), its name and value on hover */
export function ItemThumb({ item, scale = 0.62, index = 0 }: { item: Item; scale?: number; index?: number }) {
  const { t, f } = useI18n();
  const name = useItemName();
  const label = `${name(item)} · ${t.items.rarity[item.rarity]}${item.edition !== 'base' ? ` · ${t.items.edition[item.edition]}` : ''} · ${t.items.grade[item.grade] ?? item.grade} ${f.number(Math.floor(item.condition * 1000) / 10)}% · ${t.common.value} ${f.number(item.value)}`;
  return (
    <a className={`thumb thumb--r${item.rarity}`} href={portal(`/item/${encodeURIComponent(item.id)}`)} title={label} aria-label={label} style={{ '--i': index } as CSSProperties}>
      <ItemArt item={item} scale={scale} />
    </a>
  );
}

/** a row of items, overlapping when there are many */
export function ItemRow({ items, scale = 0.62, max = 8 }: { items: Item[]; scale?: number; max?: number }) {
  const { f } = useI18n();
  const shown = items.slice(0, max);
  return (
    <span className={`thumbs${items.length > 4 ? ' thumbs--tight' : ''}`}>
      {shown.map((it, i) => (
        <ItemThumb key={it.id} item={it} scale={scale} index={i} />
      ))}
      {items.length > max ? <span className="thumbs__more">+{f.number(items.length - max)}</span> : null}
    </span>
  );
}

// An item drawn with the game's own sprites (served by the game at
// /play/resources/textures), its edition as a light over the card's shape,
// and the stake sticker of the win it came from.
import type { CSSProperties } from 'react';
import type { Item } from '@/shared/api';
import { GAME_URL } from '@/shared/config';

const TEXTURES = `${GAME_URL}/resources/textures/2x`;
// the sheets at 1x: cell size and how many cells across and down
const ATLASES: Record<string, { file: string; px: number; py: number; cols: number; rows: number }> = {
  Joker: { file: 'Jokers.png', px: 71, py: 95, cols: 10, rows: 16 },
  tags: { file: 'tags.png', px: 34, py: 34, cols: 6, rows: 5 },
};
const STICKERS = { file: 'stickers.png', px: 71, py: 95, cols: 5, rows: 3 };
// the game's stake stickers (G.shared_stickers), by stake
const STAKE_STICKERS: Record<number, [number, number]> = {
  1: [1, 0], 2: [2, 0], 3: [3, 0], 4: [0, 1], 5: [4, 0], 6: [1, 1], 7: [2, 1], 8: [3, 1],
};

type Atlas = typeof STICKERS;

/** one cell of a sheet, `scale` pixels per 1x pixel: its shape (a mask) and, unless `picture` is false, its picture */
function cell(atlas: Atlas, x: number, y: number, scale: number, picture = true): CSSProperties {
  const url = `url("${TEXTURES}/${atlas.file}")`;
  const size = `${atlas.cols * atlas.px * scale}px ${atlas.rows * atlas.py * scale}px`;
  const pos = `${-x * atlas.px * scale}px ${-y * atlas.py * scale}px`;
  const shape: CSSProperties = {
    width: atlas.px * scale, height: atlas.py * scale,
    maskImage: url, maskSize: size, maskPosition: pos, WebkitMaskImage: url, WebkitMaskSize: size, WebkitMaskPosition: pos,
  };
  return picture ? { ...shape, backgroundImage: url, backgroundSize: size, backgroundPosition: pos } : shape;
}

/** the item's picture: `scale` 1 is the game's 1x size (71 x 95 for a joker) */
export function ItemArt({ item, scale: asked = 1 }: { item: Item; scale?: number }) {
  const atlas = item.sprite ? ATLASES[item.sprite.atlas] : undefined;
  // (a tag's sprite is half a joker's width: drawn larger, so that both read alike side by side)
  const scale = item.kind === 'tag' ? asked * 1.55 : asked;
  if (!atlas || !item.sprite) {
    return (
      <div className="item-art item-art--missing" style={{ width: 71 * scale, height: 95 * scale }}>
        {item.name}
      </div>
    );
  }
  const { x, y } = item.sprite.pos;
  const soul = item.sprite.soul_pos;
  const sticker = item.stake && item.kind === 'joker' ? STAKE_STICKERS[item.stake] : undefined;
  return (
    <div className={`item-art item-art--${item.edition} item-art--${item.kind}`} style={{ width: atlas.px * scale, height: atlas.py * scale }}>
      <div className="item-art__layer item-art__base" style={cell(atlas, x, y, scale)} />
      {soul ? <div className="item-art__layer item-art__soul" style={cell(atlas, soul.x, soul.y, scale)} /> : null}
      {item.edition !== 'base' ? <div className="item-art__layer item-art__edition" style={cell(atlas, x, y, scale, false)} /> : null}
      {sticker ? <div className="item-art__layer item-art__sticker" style={cell(STICKERS, sticker[0], sticker[1], scale)} /> : null}
    </div>
  );
}

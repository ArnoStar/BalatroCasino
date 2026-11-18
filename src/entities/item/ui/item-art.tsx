// An item drawn with the game's own sprites (served by the game at
// /play/resources/textures): its card (a joker, a tarot, planet or spectral
// card, or a playing card: its enhancement, rank and suit, and seal), its
// edition as a light over the card's shape, and the stake sticker of the win
// it came from.
import type { CSSProperties } from 'react';
import type { Item, SpriteCell } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { wear_image } from '../model/wear';

const TEXTURES = `${GAME_URL}/resources/textures/2x`;
type Atlas = { file: string; px: number; py: number; cols: number; rows: number };
const SHEET = (file: string, cols: number, rows: number): Atlas => ({ file, px: 71, py: 95, cols, rows });
// the sheets at 1x: cell size and how many cells across and down
const ATLASES: Record<string, Atlas> = {
  Joker: SHEET('Jokers.png', 10, 16),
  Tarot: SHEET('Tarots.png', 10, 6),
  Planet: SHEET('Tarots.png', 10, 6),
  Spectral: SHEET('Tarots.png', 10, 6),
  centers: SHEET('Enhancers.png', 7, 5),
  cards_1: SHEET('8BitDeck.png', 13, 4),
};
const STICKERS = SHEET('stickers.png', 5, 3);
// the game's stake stickers (G.shared_stickers), by stake
const STAKE_STICKERS: Record<number, [number, number]> = {
  1: [1, 0], 2: [2, 0], 3: [3, 0], 4: [0, 1], 5: [4, 0], 6: [1, 1], 7: [2, 1], 8: [3, 1],
};

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

function Layer({ sprite, scale, className }: { sprite: SpriteCell | null | undefined; scale: number; className: string }) {
  const atlas = sprite ? ATLASES[sprite.atlas] : undefined;
  if (!sprite || !atlas) return null;
  return <div className={`item-art__layer ${className}`} style={cell(atlas, sprite.pos.x, sprite.pos.y, scale)} />;
}

/** the item's picture: `scale` 1 is the game's 1x size (71 x 95); its wear (from its condition) drawn over it */
export function ItemArt({ item, scale = 1 }: { item: Item; scale?: number }) {
  const sprite = item.sprite;
  const atlas = sprite ? ATLASES[sprite.atlas] : undefined;
  if (!atlas || !sprite) {
    return (
      <div className="item-art item-art--missing" style={{ width: 71 * scale, height: 95 * scale }}>
        {item.name}
      </div>
    );
  }
  const { x, y } = sprite.pos;
  const soul = sprite.soul_pos;
  const sticker = item.stake && item.kind === 'joker' ? STAKE_STICKERS[item.stake] : undefined;
  const wear = typeof item.condition === 'number' ? 1 - item.condition : 0;
  const grime = typeof item.condition === 'number' ? wear_image(item.id, wear) : '';
  const crisp = item.condition >= 0.8 ? (item.condition >= 0.95 ? ' item-art--mint' : ' item-art--crisp') : '';
  return (
    <div
      className={`item-art item-art--${item.edition} item-art--${item.kind}${crisp}`}
      style={{ width: atlas.px * scale, height: atlas.py * scale, '--wear': wear } as CSSProperties}
    >
      <div className="item-art__card">
        <div className="item-art__layer item-art__base" style={cell(atlas, x, y, scale)} />
        <Layer sprite={sprite.front} scale={scale} className="item-art__front" />
        {item.edition !== 'base' ? <div className="item-art__layer item-art__edition" style={cell(atlas, x, y, scale, false)} /> : null}
        <Layer sprite={sprite.seal} scale={scale} className="item-art__seal" />
        {soul ? <div className="item-art__layer item-art__soul" style={cell(atlas, soul.x, soul.y, scale)} /> : null}
        <Layer sprite={sprite.overlay} scale={scale} className="item-art__soul" />
      </div>
      {grime ? <div className="item-art__layer item-art__wear" style={{ ...cell(atlas, x, y, scale, false), backgroundImage: grime }} /> : null}
      {crisp ? <div className="item-art__layer item-art__gloss" style={cell(atlas, x, y, scale, false)} /> : null}
      {sticker ? <div className="item-art__layer item-art__sticker" style={cell(STICKERS, sticker[0], sticker[1], scale)} /> : null}
    </div>
  );
}

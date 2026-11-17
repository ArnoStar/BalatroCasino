// What a casino game means for the page: who plays which side, their colours,
// where the roll fell, what a dice game pays. (The rules are the item service's:
// nothing here decides a game.)
import type { CasinoGame, Item, Side } from '@/shared/api';

// one colour per player, in the order they came in: the dataviz palette's eight
// categorical slots (validated on the panels' surface); a ninth player and
// after share the neutral "other" (their names and chances are listed beside)
const COLOURS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const OTHER = '#6b6584';
const SIDE_COLOURS: Record<Side, string> = { chips: '#4c9dff', mult: '#ff5c7a' };

export function player_colours(game: CasinoGame): Record<string, string> {
  const out: Record<string, string> = {};
  if (game.mode === 'coinflip' && game.side) {
    // a coinflip's players are their sides' colours
    game.entries.forEach((e, i) => (out[e.player] ??= SIDE_COLOURS[side_of(game, i) ?? 'chips']));
    return out;
  }
  if (game.mode === 'dice') {
    game.entries.forEach((e, i) => (out[e.player] ??= i === 0 ? '#ffc53d' : '#9b7bff'));
    return out;
  }
  for (const e of game.entries) {
    const n = Object.keys(out).length;
    out[e.player] ??= n < COLOURS.length ? COLOURS[n] : OTHER;
  }
  return out;
}

/** a coinflip entry's side: the first player's, the other for the second */
export function side_of(game: CasinoGame, entry: number): Side | null {
  if (game.mode !== 'coinflip' || !game.side) return null;
  return entry === 0 ? game.side : game.side === 'chips' ? 'mult' : 'chips';
}

/** the side a coinflip landed on (null: not flipped) */
export function landed_side(game: CasinoGame): Side | null {
  if (game.mode !== 'coinflip' || !game.winner || !game.side) return null;
  return game.winner === game.entries[0]?.player ? game.side : game.side === 'chips' ? 'mult' : 'chips';
}

/** where the roll fell, as a share of the pot (0 to 1; null: not drawn) */
export const roll_at = (game: CasinoGame) => (game.roll !== null && game.value ? (game.roll + 0.5) / game.value : null);

/** the value a player put in */
export const stake_of = (game: CasinoGame, player: string | undefined) =>
  game.entries.filter((e) => e.player === player).reduce((sum, e) => sum + e.value, 0);

/** a player's chance, percent (0: not in) */
export const chance_of = (game: CasinoGame, player: string | undefined) =>
  game.value ? (100 * stake_of(game, player)) / game.value : 0;

export const players_of = (game: CasinoGame) => [...new Set(game.entries.map((e) => e.player))];

export const items_of = (game: CasinoGame): Item[] => game.entries.flatMap((e) => e.items);

/** the first player's chance a duel asks for (a dice game's, else half) */
export const asked = (game: CasinoGame) => game.chance ?? 50;

/** what a stake pays back if it wins: the pot over the stake ("×4.00" at 25%) */
export const payout = (chance: number) => (chance > 0 ? 100 / chance : 0);

export const in_game = (game: CasinoGame, player: string | undefined) => !!player && game.entries.some((e) => e.player === player);

/** the player may join this duel: it is open, not theirs, and not a challenge to another */
export const can_join = (game: CasinoGame, player: string | undefined) =>
  game.status === 'open' && game.mode !== 'jackpot' && !!player && !in_game(game, player) && (!game.opponent || game.opponent === player);

/** what a duel's second player's items must be worth (both included) against the first's, for the first to have
 *  `chance` percent: the item service's join_range (it decides; this shows it before a game exists) */
export function join_range(value: number, chance: number, margin: number): [number, number] {
  const rest = 100 - chance;
  return [Math.ceil((value * rest * (100 - margin)) / (chance * 100)), Math.floor((value * rest * (100 + margin)) / (chance * 100))];
}

export const by_newest = (a: CasinoGame, b: CasinoGame) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id);

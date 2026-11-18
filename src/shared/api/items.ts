// The item service (BalatroItemService): the player's items (the game's cards
// with their upgrades), their coins, and the casino (coinflips, dice, the
// jackpot), its numbers and its live stream.
import { ITEMS_BASE } from '@/shared/config';
import { read_json } from './problem';
import { authorized_fetch } from './session';

export type Edition = 'base' | 'foil' | 'holographic' | 'polychrome' | 'negative';
export type GameMode = 'coinflip' | 'dice' | 'jackpot';
export type GameStatus = 'open' | 'done' | 'cancelled';
export type Side = 'chips' | 'mult';
export type Period = 'day' | 'week' | 'all';

export type ItemKind = 'joker' | 'tarot' | 'planet' | 'spectral' | 'card';

export interface SpriteCell { atlas: string; pos: { x: number; y: number } }

export interface ItemSprite extends SpriteCell {
  soul_pos?: { x: number; y: number } | null;
  /** drawn over the card (The Soul's gem) */
  overlay?: SpriteCell | null;
  /** a playing card's rank and suit (none for a Stone Card) */
  front?: SpriteCell | null;
  /** a playing card's seal */
  seal?: SpriteCell | null;
}

export interface Item {
  id: string;
  kind: ItemKind;
  /** the game's key: a center's (j_joker, c_fool ...), or a playing card's (S_A ...) */
  key: string;
  name: string;
  edition: Edition;
  /** a playing card's enhancement (m_glass ...) and seal (Gold, Red, Blue, Purple) */
  enhancement: string | null;
  seal: string | null;
  /** 1 Common, 2 Uncommon, 3 Rare, 4 Legendary */
  rarity: 1 | 2 | 3 | 4;
  /** the stake of the win it came from (1 White ... 8 Gold) */
  stake: number | null;
  serial: number;
  minted: number;
  /** one in this many cards of its kind's standard table: its value in coins (in the casino too) */
  odds: number;
  owner: string;
  owner_name: string | null;
  source: string;
  found_at: string;
  acquired_at: string;
  tradable_at: string;
  /** out of its trade hold, not staked, not for sale: it can be staked */
  tradable: boolean;
  /** the casino game it is staked in */
  staked: string | null;
  sprite: ItemSprite | null;
}

export interface ItemsMe {
  id: string;
  name: string | null;
  /** the casino (and trading) opens after a first counted win */
  can_trade: boolean;
  admin: boolean;
  items: number;
  /** coins: what the player's runs earned, for boosters and the market (on the portal) */
  coins: number;
  showcase: Item | null;
}

export interface ItemsPlayer { id: string; name: string | null; you: boolean; can_trade: boolean; items: number; showcase: Item | null }

export interface GameEntry {
  player: string;
  player_name: string | null;
  items: Item[];
  /** the items' value (their odds) when they were staked */
  value: number;
  /** percent of the pot */
  chance: number;
  /** its part of the pot: from low (included) to high (excluded) */
  low: number;
  high: number;
  seed: string;
  at: string;
}

export interface CasinoGame {
  id: string;
  mode: GameMode;
  status: GameStatus;
  /** a coinflip's first player's side (the second has the other) */
  side: Side | null;
  /** a dice game: the chance its first player chose, percent */
  chance: number | null;
  /** a challenge: the only player who may join */
  opponent: string | null;
  opponent_name: string | null;
  entries: GameEntry[];
  value: number;
  /** SHA-256 of the server seed, shown from the start */
  seed_hash: string;
  /** shown once the game is over */
  server_seed: string | null;
  /** the point of the pot that won */
  roll: number | null;
  winner: string | null;
  winner_name: string | null;
  /** an open duel: what the other player's items must be worth together */
  join_min: number | null;
  join_max: number | null;
  created_at: string;
  updated_at: string;
  /** when a jackpot is drawn (once two players are in) */
  closes_at: string | null;
}

export interface JackpotState {
  /** the pot taking items (null: the next item opens one) */
  round: CasinoGame | null;
  last: CasinoGame | null;
  /** the service's time */
  now: string;
}

export interface CasinoRules {
  open: boolean;
  max_items: number;
  coinflip_margin: number;
  max_open_coinflips: number;
  jackpot_seconds: number;
  jackpot_max_players: number;
  jackpot_max_items: number;
  trade_hold_days: number;
  dice_min_chance: number;
  dice_max_chance: number;
}

/** a game someone won, in a line */
export interface Win {
  game: string;
  mode: GameMode;
  player: string;
  player_name: string | null;
  value: number;
  /** the winner's chance, percent */
  chance: number;
  players: number;
  items: number;
  at: string;
}

export interface CasinoStats {
  player: string;
  name: string | null;
  games: number;
  wins: number;
  staked: number;
  won: number;
  lost: number;
  net: number;
  modes: Partial<Record<GameMode, { games: number; wins: number }>>;
  biggest: Win | null;
  luckiest: Win | null;
}

export interface Rank { player: string; name: string | null; games: number; wins: number; staked: number; net: number }

export interface Leaderboard {
  period: Period;
  since: string | null;
  games: number;
  value: number;
  players: number;
  winners: Rank[];
  stakers: Rank[];
  biggest: Win[];
  luckiest: Win[];
}

/** everything the casino shows: the live stream's first event */
export interface Snapshot {
  coinflips: CasinoGame[];
  dice: CasinoGame[];
  jackpot: JackpotState;
  recent: CasinoGame[];
  rules: CasinoRules;
}

export interface Bet { items: string[]; seed?: string }
export interface Duel extends Bet { opponent?: string | null }

const url = (path: string) => `${ITEMS_BASE}${path}`;
const json = { 'content-type': 'application/json' };
const id = encodeURIComponent;
const get = <T,>(path: string) => authorized_fetch(url(path)).then((r) => read_json<T>(r));
const send = <T,>(method: string, path: string, body?: unknown) =>
  authorized_fetch(url(path), { method, headers: json, body: body === undefined ? undefined : JSON.stringify(body) })
    .then((r) => read_json<T>(r));

export const items_api = {
  me: () => get<ItemsMe>('/v1/me'),
  mine: () => get<Item[]>('/v1/me/items'),
  find_players: (q: string) => get<ItemsPlayer[]>(`/v1/players?q=${id(q)}`),
  player: (player: string) => get<ItemsPlayer>(`/v1/players/${id(player)}`),
  rules: () => fetch(url('/v1/casino/rules')).then((r) => read_json<CasinoRules>(r)),
  coinflips: () => get<CasinoGame[]>('/v1/casino/coinflips'),
  create_coinflip: (bet: Duel & { side: Side }) => send<CasinoGame>('POST', '/v1/casino/coinflips', bet),
  join_coinflip: (game: string, bet: Bet) => send<CasinoGame>('POST', `/v1/casino/coinflips/${id(game)}/join`, bet),
  cancel_coinflip: (game: string) => send<CasinoGame>('POST', `/v1/casino/coinflips/${id(game)}/cancel`),
  dice: () => get<CasinoGame[]>('/v1/casino/dice'),
  create_dice: (bet: Duel & { chance: number }) => send<CasinoGame>('POST', '/v1/casino/dice', bet),
  join_dice: (game: string, bet: Bet) => send<CasinoGame>('POST', `/v1/casino/dice/${id(game)}/join`, bet),
  cancel_dice: (game: string) => send<CasinoGame>('POST', `/v1/casino/dice/${id(game)}/cancel`),
  jackpot: () => get<JackpotState>('/v1/casino/jackpot'),
  join_jackpot: (bet: Bet) => send<CasinoGame>('POST', '/v1/casino/jackpot', bet),
  leave_jackpot: () => send<CasinoGame>('POST', '/v1/casino/jackpot/leave'),
  /** games that are over, the last first (`player`: only theirs; `before`: the next page) */
  games: (q: { player?: string; mode?: GameMode; limit?: number; before?: string } = {}) => {
    const p = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return get<CasinoGame[]>(`/v1/casino/games?${p}`);
  },
  game: (game: string) => get<CasinoGame>(`/v1/casino/games/${id(game)}`),
  stats: (player: string) => get<CasinoStats>(`/v1/casino/players/${id(player)}/stats`),
  leaderboard: (period: Period) => get<Leaderboard>(`/v1/casino/leaderboard?period=${period}`),
};

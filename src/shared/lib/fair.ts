// The casino's draws are provably fair (BalatroItemService, domain/casino.py):
// the SHA-256 of the server seed is shown from the start, and once the game is
// over its server seed gives the roll:
//   h    = first 13 hex digits of HMAC-SHA256(key = server seed, message = "<game id>:<seed 1>:<seed 2>...")
//   roll = h * pot // 16^13
// and the entry whose part of the pot (the values laid end to end) holds the
// roll wins. This computes it in the browser, trusting none of the service's numbers.

const bytes = (s: string) => new TextEncoder().encode(s);
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export const ROLL_DIGITS = 13;

export async function sha256(text: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', bytes(text)));
}

export async function hmac_sha256(key: string, message: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', bytes(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, bytes(message)));
}

export interface Draw {
  /** SHA-256 of the server seed */
  hash: string;
  /** what the HMAC signs */
  message: string;
  digest: string;
  /** the roll: a point of the pot, from 0 to value (excluded) */
  roll: number;
  /** the pot */
  value: number;
  /** the index of the entry holding the roll */
  winner: number;
  /** each entry's part of the pot: low (included) to high (excluded) */
  parts: [number, number][];
}

/** the draw of a game, from its inputs */
export async function compute_draw(server_seed: string, game_id: string, seeds: string[], values: number[]): Promise<Draw> {
  const message = [game_id, ...seeds].join(':');
  const [hash, digest] = await Promise.all([sha256(server_seed), hmac_sha256(server_seed, message)]);
  const value = values.reduce((a, b) => a + b, 0);
  const roll = value > 0 ? Number((BigInt(`0x${digest.slice(0, ROLL_DIGITS)}`) * BigInt(value)) / 16n ** BigInt(ROLL_DIGITS)) : 0;
  const parts: [number, number][] = [];
  let low = 0;
  for (const v of values) {
    parts.push([low, low + v]);
    low += v;
  }
  return { hash, message, digest, roll, value, winner: parts.findIndex(([l, h]) => roll >= l && roll < h), parts };
}

/** a seed of the player's own for the draws (16 hex digits) */
export function new_seed(): string {
  return [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const SEED_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const SEED_KEY = 'balatro.casino.seed';

/** the player's seed: theirs to choose (/fair), kept in this browser; every stake brings it */
export function my_seed(): string {
  try {
    const s = localStorage.getItem(SEED_KEY);
    if (s && SEED_PATTERN.test(s)) return s;
    const fresh = new_seed();
    localStorage.setItem(SEED_KEY, fresh);
    return fresh;
  } catch {
    return new_seed();
  }
}

export function set_my_seed(seed: string) {
  if (!SEED_PATTERN.test(seed)) return;
  try {
    localStorage.setItem(SEED_KEY, seed);
  } catch {
    /* no storage */
  }
}

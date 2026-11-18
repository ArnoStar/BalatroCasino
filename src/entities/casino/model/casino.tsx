// The casino as the player sees it, kept up to date for every page: who they
// are (the item service's), their items, and the games, live (the service's
// event stream: the coinflips and dice games waiting, the pot, the last
// draws). The stream is opened again when it ends (its token expired, it fell
// behind, the connection broke); each new one starts with everything.
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import {
  items_api,
  ProblemError,
  read_live,
  type CasinoGame,
  type CasinoRules,
  type Item,
  type ItemsMe,
  type LiveEvent,
} from '@/shared/api';
import { by_newest, in_game } from '../lib/games';

type Status = 'loading' | 'ready' | 'signed-out' | 'error';
type Live = 'connecting' | 'live' | 'offline';

interface State {
  status: Status;
  me: ItemsMe | null;
  items: Item[];
  error: unknown;
  live: Live;
  coinflips: CasinoGame[];
  dice: CasinoGame[];
  /** the jackpot taking items (null: none yet) */
  pot: CasinoGame | null;
  last_pot: CasinoGame | null;
  /** games drawn, the last first */
  recent: CasinoGame[];
  rules: CasinoRules | null;
  /** the service's clock minus this one (ms) */
  offset: number;
  /** duels just drawn or taken back: their cards show it a few seconds */
  resolved: CasinoGame[];
}

type Action =
  | { type: 'me'; me: ItemsMe }
  | { type: 'items'; items: Item[] }
  | { type: 'status'; status: Status; error?: unknown }
  | { type: 'live'; live: Live }
  | { type: 'event'; event: LiveEvent }
  | { type: 'forget'; id: string };

const EMPTY: State = {
  status: 'loading', me: null, items: [], error: null, live: 'connecting', coinflips: [], dice: [], pot: null,
  last_pot: null, recent: [], rules: null, offset: 0, resolved: [],
};

const RECENT = 40;
/** how long a duel's card shows how it ended */
export const RESOLVED_MS = 9000;

const add_recent = (list: CasinoGame[], g: CasinoGame) => [g, ...list.filter((x) => x.id !== g.id)].slice(0, RECENT);
const upsert = (list: CasinoGame[], g: CasinoGame) => [g, ...list.filter((x) => x.id !== g.id)].sort(by_newest);

function on_game(s: State, g: CasinoGame): State {
  if (g.mode === 'jackpot') {
    if (g.status === 'open') return { ...s, pot: g };
    const pot = s.pot?.id === g.id ? null : s.pot;
    return g.status === 'done' ? { ...s, pot, last_pot: g, recent: add_recent(s.recent, g) } : { ...s, pot };
  }
  const key = g.mode === 'coinflip' ? 'coinflips' : 'dice';
  if (g.status === 'open') return { ...s, [key]: upsert(s[key], g) };
  const was = s[key].some((x) => x.id === g.id);
  return {
    ...s,
    [key]: s[key].filter((x) => x.id !== g.id),
    recent: g.status === 'done' ? add_recent(s.recent, g) : s.recent,
    resolved: was ? [g, ...s.resolved.filter((x) => x.id !== g.id)] : s.resolved,
  };
}

function reduce(s: State, a: Action): State {
  switch (a.type) {
    case 'me':
      return { ...s, me: a.me, status: 'ready', error: null };
    case 'items':
      return { ...s, items: a.items };
    case 'status':
      return { ...s, status: a.status, error: a.error ?? null };
    case 'live':
      return { ...s, live: a.live };
    case 'forget':
      return { ...s, resolved: s.resolved.filter((g) => g.id !== a.id) };
    case 'event': {
      const e = a.event;
      if (e.type === 'hello') {
        const d = e.data;
        return {
          ...s, live: 'live', coinflips: [...d.coinflips].sort(by_newest), dice: [...d.dice].sort(by_newest), pot: d.jackpot.round,
          last_pot: d.jackpot.last, recent: d.recent, rules: d.rules, offset: Date.parse(d.jackpot.now) - Date.now(),
        };
      }
      return e.type === 'game' ? on_game(s, e.data) : s;
    }
  }
}

/** a change of a game, as the pages hear it: `known`: the page showed it open before (it just ended) */
export interface CasinoNews {
  game: CasinoGame;
  known: boolean;
  /** the game before this change, as the page had it */
  before: CasinoGame | null;
}

export interface CasinoValue extends State {
  /** the value of the player's items that can be staked now */
  ready_value: number;
  /** their items that can be staked now */
  stakable: Item[];
  reload: () => void;
  reload_items: () => void;
  /** a game the player just played (the service's answer): shown at once, before the stream says so */
  apply: (game: CasinoGame) => void;
  /** every change of a game; returns the unsubscription */
  subscribe: (handler: (news: CasinoNews) => void) => () => void;
  /** the service's time now (ms) */
  server_now: () => number;
}

const CasinoContext = createContext<CasinoValue | null>(null);

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((done) => {
    const t = setTimeout(done, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); done(); }, { once: true });
  });

const signed_out = (e: unknown) => e instanceof ProblemError && e.status === 401;

export function CasinoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, EMPTY);
  const handlers = useRef(new Set<(n: CasinoNews) => void>());
  const current = useRef(state);
  current.current = state;

  const load_me = useCallback(async () => {
    try {
      dispatch({ type: 'me', me: await items_api.me() });
    } catch (error) {
      dispatch({ type: 'status', status: signed_out(error) ? 'signed-out' : 'error', error });
    }
  }, []);

  const load_items = useCallback(async () => {
    try {
      dispatch({ type: 'items', items: await items_api.mine() });
    } catch {
      // (the next change tries again)
    }
  }, []);

  useEffect(() => {
    void load_me();
    // (signed in or out in another tab: the portal)
    const on_storage = (e: StorageEvent) => {
      if (e.key === 'balatro.session' || e.key === null) void load_me();
    };
    window.addEventListener('storage', on_storage);
    return () => window.removeEventListener('storage', on_storage);
  }, [load_me]);

  const me_id = state.me?.id;
  useEffect(() => {
    if (me_id) void load_items();
  }, [me_id, load_items]);

  // the player's items change when a game of theirs is made, joined, drawn or taken back
  const items_timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const items_soon = useCallback(() => {
    if (items_timer.current) clearTimeout(items_timer.current);
    items_timer.current = setTimeout(() => void load_items(), 250);
  }, [load_items]);

  const emit = useCallback((game: CasinoGame) => {
    const s = current.current;
    const before =
      [...s.coinflips, ...s.dice, ...(s.pot ? [s.pot] : [])].find((g) => g.id === game.id) ?? null;
    const known = !!before && before.status === 'open';
    dispatch({ type: 'event', event: { type: 'game', data: game } });
    if (s.me && (in_game(game, s.me.id) || game.winner === s.me.id)) items_soon();
    for (const h of handlers.current) h({ game, known, before });
  }, [items_soon]);

  useEffect(() => {
    if (state.status !== 'ready') return;
    const abort = new AbortController();
    const on_event = (e: LiveEvent) => {
      if (e.type === 'game') emit(e.data);
      else dispatch({ type: 'event', event: e });
    };
    void (async () => {
      let delay = 0;
      while (!abort.signal.aborted) {
        dispatch({ type: 'live', live: delay ? 'offline' : 'connecting' });
        try {
          await read_live(on_event, abort.signal);
          delay = 0; // (it ended on its own: open the next one at once)
        } catch (error) {
          if (abort.signal.aborted) return;
          if (signed_out(error)) {
            dispatch({ type: 'status', status: 'signed-out', error });
            return;
          }
          delay = Math.min(30_000, delay ? delay * 2 : 1_500);
        }
        dispatch({ type: 'live', live: 'offline' });
        await wait(delay, abort.signal);
      }
    })();
    return () => abort.abort();
  }, [state.status, emit]);

  // a duel's card shows how it ended for a few seconds, then goes
  const resolved_ids = state.resolved.map((g) => g.id).join(',');
  useEffect(() => {
    if (!resolved_ids) return;
    const timers = resolved_ids.split(',').map((id) => setTimeout(() => dispatch({ type: 'forget', id }), RESOLVED_MS));
    return () => timers.forEach(clearTimeout);
  }, [resolved_ids]);

  const subscribe = useCallback((handler: (n: CasinoNews) => void) => {
    handlers.current.add(handler);
    return () => {
      handlers.current.delete(handler);
    };
  }, []);

  const value = useMemo<CasinoValue>(() => {
    const stakable = state.items.filter((i) => i.tradable && i.value > 0);
    return {
      ...state,
      stakable,
      ready_value: stakable.reduce((sum, i) => sum + i.value, 0),
      reload: () => void load_me(),
      reload_items: () => void load_items(),
      apply: emit,
      subscribe,
      server_now: () => Date.now() + current.current.offset,
    };
  }, [state, load_me, load_items, emit, subscribe]);
  return <CasinoContext.Provider value={value}>{children}</CasinoContext.Provider>;
}

export function useCasino(): CasinoValue {
  const value = useContext(CasinoContext);
  if (!value) throw new Error('useCasino outside CasinoProvider');
  return value;
}

/** calls `handler` with each change of a game while the component is shown */
export function useCasinoNews(handler: (news: CasinoNews) => void) {
  const { subscribe } = useCasino();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => subscribe((n) => ref.current(n)), [subscribe]);
}

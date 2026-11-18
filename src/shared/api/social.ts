// The social service (BalatroSocial): the friends a player can challenge,
// everyone's profile picture, and what waits for the player (the notification
// bell: friend requests, unread messages, invites to a friend's match), live.
import { SOCIAL_BASE } from '@/shared/config';
import { ProblemError, read_json } from './problem';
import { authorized_fetch } from './session';

export interface Friend {
  id: string;
  name: string | null;
  /** their profile picture's version (null: none) */
  avatar: number | null;
  presence: { online: boolean } | null;
}

const url = (path: string) => `${SOCIAL_BASE}${path}`;
const id = encodeURIComponent;

/** a player's profile picture, for an <img> (null: they have none: their initials) */
export const avatar_url = (player: string, version: number | null | undefined) =>
  version ? `${SOCIAL_BASE}/v1/avatars/${id(player)}?v=${version}` : null;

/**
 * Any player's profile picture version (the social service's public
 * `GET /v1/avatars?ids=`): asked for together (a page of names makes one
 * request), kept for the page's life. `undefined`: not known yet; null: none.
 */
export const avatar_versions = (() => {
  const known = new Map<string, number | null>();
  const wanted = new Set<string>();
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  async function ask() {
    timer = null;
    const ids = [...wanted].filter((i) => !known.has(i));
    wanted.clear();
    for (let i = 0; i < ids.length; i += 100) {
      const part = ids.slice(i, i + 100);
      let got: Record<string, number | null> = {};
      try {
        const r = await fetch(url(`/v1/avatars?ids=${part.map(id).join(',')}`));
        if (r.ok) got = await r.json();
      } catch {
        // (no service: everyone shows their initials)
      }
      for (const p of part) if (!known.has(p)) known.set(p, got[p] ?? null);
    }
    for (const l of listeners) l();
  }
  return {
    peek: (player: string) => known.get(player),
    /** looks it up (with the others asked for in the same moment) */
    want(player: string) {
      if (!player || known.has(player) || wanted.has(player)) return;
      wanted.add(player);
      timer ??= setTimeout(ask, 20);
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
})();

export interface PlayerRef { id: string; name: string | null; avatar: number | null }
export interface FriendRequest { id: string; sender: PlayerRef; recipient: PlayerRef; status: string; created_at: string }
export interface MatchInvite {
  id: string; sender: PlayerRef; recipient: PlayerRef; mode: string; code: string;
  status: 'pending' | 'accepted' | 'declined'; created_at: string; expires_at: string;
}
export interface ChatMessage { id: string; conversation: string; seq: number; sender: PlayerRef | null; kind: string; text: string }
export interface Conversation {
  id: string; kind: 'direct' | 'group'; title: string | null; members: PlayerRef[]; last_seq: number;
  last_message: ChatMessage | null; unread: number; muted: boolean;
}
export interface Inbox { requests: FriendRequest[]; conversations: Conversation[]; invites: MatchInvite[]; count: number }
export interface SocialEvent { type: string; data: any }

const send = <T,>(method: string, path: string, body?: unknown) =>
  authorized_fetch(url(path), {
    method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
  }).then((r) => read_json<T>(r));

export const social_api = {
  /** the player's friends (they may be challenged) */
  friends: () => authorized_fetch(url('/v1/friends')).then((r) => read_json<Friend[]>(r)),
  inbox: () => authorized_fetch(url('/v1/inbox')).then((r) => read_json<Inbox>(r)),
  answer_request: (request: string, answer: 'accept' | 'decline') =>
    send<FriendRequest>('POST', `/v1/friends/requests/${id(request)}/${answer}`),
  answer_invite: (invite: string, answer: 'accept' | 'decline') => send<MatchInvite>('POST', `/v1/invites/${id(invite)}/${answer}`),
};

/** the player's live social events, until the stream ends (open another) or `signal` aborts */
export async function read_social_events(on_event: (e: SocialEvent) => void, signal: AbortSignal): Promise<void> {
  const res = await authorized_fetch(url('/v1/events'), { signal, cache: 'no-store', headers: { accept: 'text/event-stream' } });
  if (!res.ok || !res.body) {
    await read_json(res);
    throw new ProblemError({ status: res.status, code: 'http_error', detail: 'the event stream is closed' });
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    let end: number;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let type = '';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) type = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (type && data) on_event({ type, data: JSON.parse(data) });
    }
  }
}

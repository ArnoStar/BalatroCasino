// The notification bell in the top bar: what waits for the player on the social
// service (friend requests, unread messages, invites to a friend's match), kept
// live by its event stream, with a pop-up for each new thing.
import { useEffect, useRef, useState } from 'react';
import { useCasino } from '@/entities/casino';
import {
  read_social_events, social_api, type Conversation, type FriendRequest, type Inbox, type MatchInvite, type SocialEvent,
} from '@/shared/api';
import { GAME_URL, portal } from '@/shared/config';
import { useI18n } from '@/shared/i18n';
import { sound } from '@/shared/lib';
import { Avatar, Icon } from '@/shared/ui';

const EMPTY: Inbox = { requests: [], conversations: [], invites: [], count: 0 };

type Pop = { key: string; request?: FriendRequest; invite?: MatchInvite; conversation?: Conversation };

function apply(box: Inbox, e: SocialEvent, me: string | null): Inbox {
  switch (e.type) {
    case 'friend_request': {
      const r = e.data as FriendRequest;
      const others = box.requests.filter((x) => x.id !== r.id);
      return { ...box, requests: r.status === 'pending' && r.recipient.id === me ? [r, ...others] : others };
    }
    case 'invite': {
      const i = e.data as MatchInvite;
      const others = box.invites.filter((x) => x.id !== i.id);
      return { ...box, invites: i.status === 'pending' && i.recipient.id === me ? [i, ...others] : others };
    }
    case 'message': {
      const m = e.data;
      if (!m.sender || m.sender.id === me) return box;
      const c = box.conversations.find((x) => x.id === m.conversation);
      if (c?.muted) return box;
      const next: Conversation = c
        ? { ...c, unread: c.unread + 1, last_message: m, last_seq: m.seq }
        : { id: m.conversation, kind: 'direct', title: null, members: [m.sender], last_seq: m.seq, last_message: m, unread: 1, muted: false };
      return { ...box, conversations: [next, ...box.conversations.filter((x) => x.id !== m.conversation)] };
    }
    case 'read':
      if (e.data.player !== me) return box;
      return { ...box, conversations: box.conversations.filter((c) => c.id !== e.data.conversation || e.data.seq < c.last_seq) };
    case 'conversation_left':
      return { ...box, conversations: box.conversations.filter((c) => c.id !== e.data.id) };
    default:
      return box;
  }
}

function join(i: MatchInvite) {
  window.location.assign(`${GAME_URL}/?match=${encodeURIComponent(i.code)}`);
}

function Row({ pop, onAnswer }: { pop: Pop; onAnswer: (key: string) => void }) {
  const { t } = useI18n();
  const answer = (fn: () => Promise<unknown>) => {
    onAnswer(pop.key);
    void fn().catch(() => undefined);
  };
  if (pop.request) {
    const r = pop.request;
    return (
      <div className="note note--request">
        <Avatar name={r.sender.name} player={r.sender.id} size="sm" />
        <span className="note__text">{t.notes.request(r.sender.name ?? t.common.a_player)}</span>
        <span className="note__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => answer(() => social_api.answer_request(r.id, 'decline'))}>{t.notes.decline}</button>
          <button type="button" className="btn btn--gold btn--sm" onClick={() => answer(() => social_api.answer_request(r.id, 'accept'))}>{t.notes.accept}</button>
        </span>
      </div>
    );
  }
  if (pop.invite) {
    const i = pop.invite;
    return (
      <div className="note note--invite">
        <Avatar name={i.sender.name} player={i.sender.id} size="sm" />
        <span className="note__text">{t.notes.invite(i.sender.name ?? t.common.a_player, i.mode === 'coop')}</span>
        <span className="note__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => answer(() => social_api.answer_invite(i.id, 'decline'))}>{t.notes.decline}</button>
          <button type="button" className="btn btn--gold btn--sm" onClick={() => {
            void social_api.answer_invite(i.id, 'accept').catch(() => undefined).finally(() => join(i));
          }}>{t.notes.join}</button>
        </span>
      </div>
    );
  }
  const c = pop.conversation!;
  const m = c.last_message;
  return (
    <a className="note" href={portal(`/chat/${encodeURIComponent(c.id)}`)}>
      <Avatar name={m?.sender?.name} player={m?.sender?.id} size="sm" />
      <span className="note__text">
        <strong>{c.title ?? m?.sender?.name ?? t.common.a_player}</strong>
        <span className="note__preview">{c.unread > 1 ? t.notes.unread(c.unread) : m?.text ?? ''}</span>
      </span>
    </a>
  );
}

export function Notifications() {
  const { t } = useI18n();
  const casino = useCasino();
  const me = casino.me?.id ?? null;
  const [box, setBox] = useState<Inbox>(EMPTY);
  const [open, setOpen] = useState(false);
  const [pops, setPops] = useState<Pop[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const signed_in = casino.status !== 'signed-out' && !!me;

  useEffect(() => {
    if (!signed_in) return;
    const abort = new AbortController();
    const pop = (p: Pop) => {
      setPops((list) => [p, ...list.filter((x) => x.key !== p.key)].slice(0, 3));
      sound.play('notify');
      setTimeout(() => setPops((list) => list.filter((x) => x.key !== p.key)), p.invite ? 30_000 : 9_000);
    };
    const on_event = (e: SocialEvent) => {
      if (e.type === 'hello') {
        void social_api.inbox().then(setBox, () => undefined);
        return;
      }
      setBox((b) => {
        const next = apply(b, e, me);
        if (e.type === 'friend_request' && next.requests.length > b.requests.length) pop({ key: `r${e.data.id}`, request: e.data });
        if (e.type === 'invite' && next.invites.some((i) => i.id === e.data.id) && !b.invites.some((i) => i.id === e.data.id)) {
          pop({ key: `i${e.data.id}`, invite: e.data });
        }
        if (e.type === 'message' && next !== b) pop({ key: `m${e.data.conversation}`, conversation: next.conversations[0] });
        return next;
      });
    };
    void (async () => {
      let delay = 0;
      while (!abort.signal.aborted) {
        try {
          await read_social_events(on_event, abort.signal);
          delay = 0;
        } catch {
          if (abort.signal.aborted) return;
          delay = Math.min(60_000, delay ? delay * 2 : 2_000);
        }
        await new Promise((done) => setTimeout(done, delay));
      }
    })();
    return () => abort.abort();
  }, [signed_in, me]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!signed_in) return null;
  const now = Date.now();
  const invites = box.invites.filter((i) => Date.parse(i.expires_at) > now);
  const unread = box.conversations.filter((c) => c.unread > 0 && !c.muted);
  const count = box.requests.length + unread.length + invites.length;
  const forget = (key: string) => {
    setPops((list) => list.filter((p) => p.key !== key));
    setBox((b) => ({
      ...b,
      requests: b.requests.filter((r) => `r${r.id}` !== key),
      invites: b.invites.filter((i) => `i${i.id}` !== key),
    }));
  };
  const rows: Pop[] = [
    ...invites.map((i) => ({ key: `i${i.id}`, invite: i })),
    ...box.requests.map((r) => ({ key: `r${r.id}`, request: r })),
    ...unread.map((c) => ({ key: `m${c.id}`, conversation: c })),
  ];
  return (
    <div className="notes" ref={root}>
      <button type="button" className="icon-button notes__bell" aria-label={t.notes.open(count)} aria-expanded={open}
        aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        <Icon name="bell" />
        {count ? <span className="notes__badge">{count > 99 ? '99+' : count}</span> : null}
      </button>
      {open ? (
        <div className="notes__panel" role="dialog" aria-label={t.notes.title}>
          <h2>{t.notes.title}</h2>
          {rows.length ? rows.map((p) => <Row key={p.key} pop={p} onAnswer={forget} />) : <p className="notes__empty">{t.notes.empty}</p>}
        </div>
      ) : pops.length ? (
        <div className="notes__pops" aria-live="polite">
          {pops.map((p) => <div key={p.key} className="notes__pop"><Row pop={p} onAnswer={forget} /></div>)}
        </div>
      ) : null}
    </div>
  );
}

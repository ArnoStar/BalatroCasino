// Who may join a new duel: anyone, or one player (a challenge): one of the
// player's friends (the social service's), or anyone found by name (the item
// service's players: a challenge needs an opponent who plays here).
import { useEffect, useState } from 'react';
import { items_api, social_api, type Friend, type ItemsPlayer } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { use_async } from '@/shared/lib';
import { Avatar, Icon } from '@/shared/ui';

export interface Opponent {
  id: string;
  name: string | null;
}

export function OpponentPicker({ value, onChange, me }: { value: Opponent | null; onChange: (o: Opponent | null) => void; me: string }) {
  const { t } = useI18n();
  const friends = use_async(() => social_api.friends().catch(() => [] as Friend[]), []);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<ItemsPlayer[] | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setFound(null);
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      items_api.find_players(query).then((list) => live && setFound(list.filter((p) => p.id !== me)), () => live && setFound([]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q, me]);

  const chip = (o: Opponent, note?: string, disabled = false) => (
    <button
      key={o.id}
      type="button"
      className={`opponent${value?.id === o.id ? ' opponent--on' : ''}`}
      aria-pressed={value?.id === o.id}
      disabled={disabled}
      onClick={() => onChange(value?.id === o.id ? null : o)}
    >
      <Avatar name={o.name} player={o.id} size="xs" />
      <span>{o.name ?? t.common.a_player}</span>
      {note ? <small>{note}</small> : null}
    </button>
  );

  return (
    <fieldset className="challenge">
      <legend>
        <Icon name="swords" /> {t.stake.challenge}
      </legend>
      <p className="muted">{t.stake.challenge_hint}</p>
      <div className="challenge__row">
        <button type="button" className={`opponent${value ? '' : ' opponent--on'}`} aria-pressed={!value} onClick={() => onChange(null)}>
          <Icon name="users" />
          <span>{t.stake.anyone}</span>
        </button>
        {value && !friends.data?.some((f) => f.id === value.id) ? chip(value) : null}
        {friends.data?.map((f) => chip({ id: f.id, name: f.name }))}
      </div>
      <label className="challenge__find">
        <Icon name="search" />
        <span className="visually-hidden">{t.stake.find}</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.stake.find} autoComplete="off" />
      </label>
      {found?.length === 0 ? <p className="muted">{t.stake.no_one}</p> : null}
      {found?.length ? (
        <div className="challenge__row">{found.map((p) => chip({ id: p.id, name: p.name }, p.can_trade ? undefined : t.stake.cant_play, !p.can_trade))}</div>
      ) : null}
    </fieldset>
  );
}

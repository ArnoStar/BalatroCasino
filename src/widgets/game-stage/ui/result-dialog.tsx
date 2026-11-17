// The moment a game of the player's is drawn: a stage over the page (the coin
// tossed, the dice rolled, the wheel spun), then who wins, the items, and
// confetti when it is them. Opened for any game of theirs (app/result-host).
import { useEffect, useRef, type ReactNode } from 'react';
import { items_of, stake_of } from '@/entities/casino';
import { ItemRow } from '@/entities/item';
import type { CasinoGame } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { sound, use_revealed } from '@/shared/lib';
import { Button, Confetti, Icon, LinkButton, Value } from '@/shared/ui';
import { DuelStage, FLIP_MS, ROLL_MS } from './duel-stage';
import { SPIN_MS, Wheel } from './wheel';

export function ResultDialog({ game, me, onClose }: { game: CasinoGame; me: string; onClose: () => void }) {
  const { t, f } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const shown = use_revealed(game.id, game.mode === 'jackpot' ? SPIN_MS + 300 : game.mode === 'coinflip' ? FLIP_MS + 200 : ROLL_MS + 200);
  const won = game.winner === me;
  const items = items_of(game);
  const theirs = game.entries.find((e) => e.player !== me);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  useEffect(() => {
    if (shown) sound.play(won ? 'win' : 'lose');
  }, [shown, won]);

  let stage: ReactNode;
  if (game.mode === 'jackpot') {
    stage = (
      <Wheel game={game} spin size="md">
        <span className="wheel__label">{t.jackpot.in_pot}</span>
        <Value value={game.value} size="lg" compact />
      </Wheel>
    );
  } else {
    stage = <DuelStage game={game} play me={me} />;
  }

  const tone = shown ? (won ? 'win' : 'loss') : 'none';
  return (
    <dialog ref={ref} className={`result result--${tone}`} aria-label={t.modes[game.mode].name} onClose={onClose}>
      <div className="result__light" aria-hidden />
      {shown && won ? <Confetti /> : null}
      <div className="result__body">
        <p className="eyebrow">
          <Icon name={game.mode === 'jackpot' ? 'coins' : game.mode === 'dice' ? 'dice' : 'sparkle'} /> {t.modes[game.mode].name}
        </p>
        {stage}
        <div className="result__text" aria-live="polite">
          {shown ? (
            <>
              <p className={`result__title ${won ? 'win' : 'loss'}`}>{won ? t.result.you_win : t.result.you_lose}</p>
              <p className="result__sub">
                {won
                  ? t.result.you_win_items(items.length, f.number(game.value - stake_of(game, me)))
                  : `${t.result.they_win(game.winner_name ?? t.common.a_player)} · ${t.result.they_win_items(items.length, f.number(game.value))}`}
              </p>
            </>
          ) : (
            <p className="result__title muted">{game.mode === 'jackpot' ? t.result.drawing : game.mode === 'dice' ? t.result.rolling : t.result.flipping}</p>
          )}
        </div>
        {shown ? <ItemRow items={items} scale={0.7} max={14} /> : null}
        <div className="result__actions">
          {shown ? (
            <LinkButton to={`/${game.id}`} tone="grey" icon={<Icon name="shield" />} onClick={() => ref.current?.close()}>
              {t.result.check}
            </LinkButton>
          ) : null}
          {shown && game.mode !== 'jackpot' && theirs ? (
            <LinkButton
              to={`/${game.mode}?challenge=${encodeURIComponent(theirs.player)}&name=${encodeURIComponent(theirs.player_name ?? '')}`}
              tone="blue"
              icon={<Icon name="swords" />}
              onClick={() => ref.current?.close()}
            >
              {t.result.rematch}
            </LinkButton>
          ) : null}
          <Button tone={shown ? 'gold' : 'ghost'} onClick={() => ref.current?.close()}>
            {t.common.close}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

// /history: every game that is over, the last first: the player's or
// everyone's, of one game or all, a page at a time.
import { useState } from 'react';
import { useCasino } from '@/entities/casino';
import type { GameMode } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { PageHeader, Panel, Segmented } from '@/shared/ui';
import { GameList } from '@/widgets/game-list';

export function HistoryPage() {
  const { t } = useI18n();
  const me = useCasino().me?.id;
  const [whose, setWhose] = useState<'mine' | 'all'>('mine');
  const [mode, setMode] = useState<GameMode | 'all'>('all');
  return (
    <div className="stack-lg">
      <PageHeader eyebrow={t.shell.brand} icon="history" title={t.history.title} lead={t.history.lead} />
      <Panel
        actions={
          <span className="row">
            <Segmented
              label={t.history.whose}
              value={whose}
              onChange={setWhose}
              options={[
                ['mine', t.history.yours],
                ['all', t.history.everyone],
              ]}
            />
            <Segmented
              label={t.history.mode}
              value={mode}
              onChange={setMode}
              options={[
                ['all', t.history.all_modes],
                ['coinflip', t.modes.coinflip.name],
                ['dice', t.modes.dice.name],
                ['jackpot', t.modes.jackpot.name],
              ]}
            />
          </span>
        }
      >
        <GameList player={whose === 'mine' ? me : undefined} mode={mode === 'all' ? undefined : mode} />
      </Panel>
    </div>
  );
}

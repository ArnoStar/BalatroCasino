// The casino, live: the item service's stream of server-sent events, read with
// fetch (an EventSource can't send the access token). `hello` first (everything
// the casino shows), then `game` at each change and `upgrade` at each upgrade; it ends with `expired` (the
// token) or `reset` (the client fell behind): open another.
import { ITEMS_BASE } from '@/shared/config';
import type { CasinoGame, Snapshot, Upgrade } from './items';
import { ProblemError, read_json } from './problem';
import { authorized_fetch } from './session';

export type LiveEvent =
  | { type: 'hello'; data: Snapshot }
  | { type: 'game'; data: CasinoGame }
  | { type: 'upgrade'; data: Upgrade }
  | { type: 'expired' | 'reset'; data: Record<string, never> };

/** reads the stream until it ends or `signal` aborts; throws a ProblemError if it is refused */
export async function read_live(on_event: (e: LiveEvent) => void, signal: AbortSignal): Promise<void> {
  const res = await authorized_fetch(`${ITEMS_BASE}/v1/casino/live`, { signal, cache: 'no-store', headers: { accept: 'text/event-stream' } });
  if (!res.ok || !res.body) {
    await read_json(res);
    throw new ProblemError({ status: res.status, code: 'http_error', detail: 'the live stream is closed' });
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
      if (type && data) on_event({ type, data: JSON.parse(data) } as LiveEvent);
    }
  }
}

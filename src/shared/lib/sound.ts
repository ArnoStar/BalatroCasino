// The casino's sounds, made by the browser (Web Audio): no files, nothing to
// download. A chip's clack, the tick of a wheel or a die, a coin's whoosh, a
// win's arpeggio, a loss's two notes. Off when the player says so (kept in this
// browser); nothing plays before the page has been touched (browsers' rule).
import { useSyncExternalStore } from 'react';

export type SoundName = 'click' | 'tick' | 'chip' | 'flip' | 'roll' | 'win' | 'lose' | 'notify' | 'land';

const KEY = 'balatro.casino.sound';
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = (() => {
  try {
    return localStorage.getItem(KEY) === 'off';
  } catch {
    return false;
  }
})();

function audio(): AudioContext | null {
  if (muted || typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx.state === 'running' ? ctx : null;
}

function tone(a: AudioContext, freq: number, start: number, length: number, type: OscillatorType, volume: number, glide?: number) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, start + length);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(volume, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + length);
  o.connect(g).connect(master!);
  o.start(start);
  o.stop(start + length + 0.02);
}

function noise(a: AudioContext, start: number, length: number, freq: number, q: number, volume: number, to?: number) {
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * length), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(freq, start);
  if (to) filter.frequency.exponentialRampToValueAtTime(to, start + length);
  filter.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(volume, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + length);
  src.connect(filter).connect(g).connect(master!);
  src.start(start);
}

const SOUNDS: Record<SoundName, (a: AudioContext, t: number) => void> = {
  click: (a, t) => tone(a, 660, t, 0.06, 'triangle', 0.12),
  tick: (a, t) => tone(a, 1900, t, 0.03, 'square', 0.035),
  chip: (a, t) => {
    noise(a, t, 0.05, 3200, 3, 0.5);
    noise(a, t + 0.045, 0.05, 2600, 3, 0.35);
  },
  flip: (a, t) => {
    noise(a, t, 0.55, 700, 1.2, 0.35, 3400);
    tone(a, 2200, t + 0.05, 0.35, 'sine', 0.05, 2600);
  },
  roll: (a, t) => {
    for (let i = 0; i < 6; i++) noise(a, t + i * 0.07, 0.04, 1800 + i * 150, 4, 0.25);
  },
  land: (a, t) => {
    tone(a, 180, t, 0.18, 'sine', 0.3, 90);
    noise(a, t, 0.08, 2500, 2, 0.25);
  },
  win: (a, t) => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      tone(a, f, t + i * 0.085, 0.55, 'triangle', 0.16);
      tone(a, f * 2, t + i * 0.085, 0.4, 'sine', 0.05);
    });
    tone(a, 1568, t + 0.5, 0.9, 'sine', 0.08);
  },
  lose: (a, t) => {
    tone(a, 392, t, 0.28, 'triangle', 0.14, 370);
    tone(a, 311.1, t + 0.24, 0.5, 'triangle', 0.14, 290);
  },
  notify: (a, t) => {
    tone(a, 880, t, 0.16, 'sine', 0.14);
    tone(a, 1318.5, t + 0.12, 0.26, 'sine', 0.12);
  },
};

export const sound = {
  play(name: SoundName) {
    const a = audio();
    if (a) SOUNDS[name](a, a.currentTime + 0.01);
  },
  get muted() {
    return muted;
  },
  set_muted(m: boolean) {
    muted = m;
    try {
      localStorage.setItem(KEY, m ? 'off' : 'on');
    } catch {
      /* no storage */
    }
    for (const l of listeners) l();
    if (!m) sound.play('click');
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** whether the sounds are off (re-renders when the player switches them) */
export function useMuted(): boolean {
  return useSyncExternalStore(sound.subscribe, () => muted);
}

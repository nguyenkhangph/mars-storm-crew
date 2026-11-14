/**
 * Tiny synthesized sound kit (Web Audio, no audio files, nothing to license).
 * Muted state is remembered per browser. Audio starts after the first click.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let windGain: GainNode | null = null;
let muted = (() => {
  try { return localStorage.getItem('solcrew.mute') === '1'; } catch { return false; }
})();

function ac(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.15, at = 0, slide?: number) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  click: () => tone(660, 0.05, 'square', 0.08),
  beep: () => { tone(880, 0.07, 'square', 0.07); tone(1320, 0.07, 'square', 0.06, 0.09); },
  tick: () => tone(220, 0.03, 'triangle', 0.05),
  alarm: () => { for (let i = 0; i < 4; i++) tone(520, 0.16, 'sawtooth', 0.08, i * 0.22, 880); },
  chime: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'triangle', 0.12, i * 0.12)),
  sad: () => [392, 330, 262].forEach((f, i) => tone(f, 0.45, 'triangle', 0.1, i * 0.22)),
  blip: () => tone(1200 + Math.random() * 300, 0.025, 'square', 0.025),
};

/** Wind loop whose loudness follows the dust (0..1). */
export function wind(level: number) {
  const c = ac();
  if (!c || !master) return;
  if (!windGain) {
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    windGain = c.createGain();
    windGain.gain.value = 0;
    src.connect(f).connect(windGain).connect(master);
    src.start();
  }
  windGain.gain.setTargetAtTime(0.04 + level * 0.35, c.currentTime, 1.2);
}

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('solcrew.mute', m ? '1' : '0'); } catch { /* ignore */ }
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.05);
}

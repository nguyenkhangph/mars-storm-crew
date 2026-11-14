import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Label } from '../engine/types';
import type { Strings } from '../i18n';
import { hideMissing, icon, portrait, scene, sceneFallback, talkStrip, type Mood, type Role } from './assets';
import { sfx } from './sound';
import { Rich } from './Rich';
import { plain } from '../i18n/plain';
import { whoLabel } from './text';

type Fit = { k: number; w: number; h: number; compact: boolean };

/**
 * Fits the game into the safe visible area (notch and Safari bars excluded).
 * Desktop and tablets get the 1280×720 stage. Short landscape phones get a
 * compact 576-tall stage as wide as the screen, so text stays readable.
 */
function measure(el: HTMLElement | null): Fit {
  const r = el?.getBoundingClientRect();
  const vw = r?.width || window.innerWidth;
  const vh = r?.height || window.innerHeight;
  if (vh < 520 && vw > vh) {
    const h = 576;
    const k = vh / h;
    return { k, h, w: Math.round(Math.min(1280, Math.max(1024, vw / k))), compact: true };
  }
  return { k: Math.min(vw / 1280, vh / 720), w: 1280, h: 720, compact: false };
}

export function Stage({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit>({ k: 1, w: 1280, h: 720, compact: false });
  useEffect(() => {
    const run = () => setFit(measure(ref.current));
    run();
    const late = () => { setTimeout(run, 250); setTimeout(run, 700); }; // iOS reports the new size late
    const ro = new ResizeObserver(run);
    if (ref.current) ro.observe(ref.current);
    window.addEventListener('orientationchange', late);
    window.visualViewport?.addEventListener('resize', run);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', late);
      window.visualViewport?.removeEventListener('resize', run);
    };
  }, []);
  const cover = Math.max(fit.w / 1280, fit.h / 720);
  return (
    <div className="viewport">
      <div className="safe" ref={ref}>
        <div
          className={`stage ${fit.compact ? 'compact ' : ''}${className}`}
          style={{ width: fit.w, height: fit.h, transform: `translate(-50%, -50%) scale(${fit.k})`, ['--cover' as string]: cover }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Station lamps and windows in the composed scene (scene pixels). */
const LIGHTS: [number, number, number][] = [[530, 492, 46], [770, 492, 46], [640, 372, 70], [430, 420, 40], [850, 412, 40], [1000, 452, 30]];
const STREAKS = Array.from({ length: 10 }, (_, i) => ({ top: 250 + ((i * 53) % 420), delay: (i * 0.73) % 4, dur: 2.2 + (i % 4) * 0.6, w: 160 + (i % 3) * 120 }));

/** Clear and storm pictures cross-fade with the dust haze (tau), with moving dust, wind and lamps. */
export function Scene({ tau, dim = 0, blur = false, pan = false }: { tau: number; dim?: number; blur?: boolean; pan?: boolean }) {
  const storm = Math.max(0, Math.min(1, (tau - 0.5) / 8));
  const nStreaks = Math.round(2 + storm * 8);
  return (
    <div className={`scene${blur ? ' blur' : ''}${pan ? ' pan' : ''}`} aria-hidden>
      <div className="scene-art"><div className="scene-inner">
        <img src={scene('clear')} alt="" onError={sceneFallback} />
        <img src={scene('storm')} alt="" onError={sceneFallback} style={{ opacity: storm }} />
        <div className="lights" style={{ opacity: 0.25 + storm * 0.75 }}>
          {LIGHTS.map(([x, y, r], i) => (
            <span key={i} style={{ left: x - r, top: y - r, width: r * 2, height: r * 2, animationDelay: `${i * 0.37}s` }} />
          ))}
        </div>
      </div></div>
      <div className="dust" style={{ opacity: 0.15 + storm * 0.6 }} />
      <div className="dust dust2" style={{ opacity: storm * 0.7 }} />
      <div className="wind">
        {STREAKS.slice(0, nStreaks).map((w, i) => (
          <span key={i} style={{ top: w.top, width: w.w, animationDelay: `${w.delay}s`, animationDuration: `${w.dur / (0.6 + storm)}s` }} />
        ))}
      </div>
      {dim > 0 && <div className="dim" style={{ opacity: dim }} />}
    </div>
  );
}

export const Icon = ({ name, size = 32 }: { name: string; size?: number }) => (
  <img className="px" src={icon(name)} alt="" width={size} height={size} onError={hideMissing} />
);

export function Chip({ label, t }: { label: Label | 'hidden'; t: Strings }) {
  return <span className={`chip chip-${label}`}>{t.labels[label]}</span>;
}

export function Portrait({ role, mood = 'neutral', size = 96, talking = false, t }: { role: Role; mood?: Mood; size?: number; talking?: boolean; t: Strings }) {
  return (
    <div className="portrait" style={{ width: size + size / 6, height: size + size / 6 }}>
      {talking ? (
        <div className="talk px" role="img" aria-label={t.roles[role]} style={{ width: size, height: size, backgroundImage: `url(${talkStrip(role)})`, backgroundSize: `${size * 2}px ${size}px`, ['--w' as string]: `${size}px` }} />
      ) : (
        <img className="px" src={portrait(role, mood)} alt={t.roles[role]} width={size} height={size} onError={hideMissing} />
      )}
    </div>
  );
}

/**
 * Reveals a line letter by letter. Kept on even with "reduce motion" (common
 * on Windows): typing and a talking mouth are small, not screen motion.
 */
function useTypewriter(text: string, delay: number, onDone?: () => void) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    let i = 0;
    let id: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      id = setInterval(() => {
        i += 1;
        setN(i);
        if (i % 3 === 0) sfx.blip();
        if (i >= text.length) { clearInterval(id); onDone?.(); }
      }, 30);
    }, delay);
    return () => { clearTimeout(start); clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delay]);
  return n;
}

export function Speaker({ role, line, side, mood = 'neutral', delay = 0, t }: { role: Role; line: string; side: 'l' | 'r'; mood?: Mood; delay?: number; t: Strings }) {
  const text = plain(line);
  const n = useTypewriter(text, delay);
  const typing = n > 0 && n < text.length;
  return (
    <div className={`speaker speaker-${side}${typing ? ' talking' : ''}`} style={{ animationDelay: `${delay / 1000}s` }}>
      <Portrait role={role} mood={mood} talking={typing} t={t} />
      <div className="bubble">
        <div className="who">{whoLabel(t, role)}</div>
        <div className="line">
          {n >= text.length ? <Rich text={line} t={t} /> : (
            <>
              <span>{text.slice(0, n)}</span>
              <span className="line-ghost" aria-hidden>{text.slice(n)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Bobbing "continue" arrow from the dialog kit. */
export const NextArrow = () => <span className="next-arrow px" aria-hidden />;

export function Bulletin({ text, label, t }: { text: string; label: Label | 'hidden'; t: Strings }) {
  return (
    <div className="bulletin" role="status" aria-live="polite">
      <Chip label={label} t={t} />
      <div><Rich text={text} t={t} /></div>
      {label === 'hidden' && <div className="bulletin-note">{t.ui.hiddenNote}</div>}
    </div>
  );
}

export function Modal({ title, onClose, closeText, children }: { title: string; onClose: () => void; closeText: string; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
        <button type="button" className="btn btn-amber" onClick={onClose} autoFocus>{closeText}</button>
      </div>
    </div>
  );
}

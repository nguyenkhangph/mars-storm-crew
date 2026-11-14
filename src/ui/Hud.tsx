import { useState } from 'react';
import type { Row } from '../engine/types';
import { P } from '../engine/params';
import { delaySeconds, solDate } from '../data/delay';
import { formatDate, formatDelay, type Lang, type Strings } from '../i18n';
import { Icon, Portrait } from './bits';
import { Term } from './Rich';

type Fill = 'teal' | 'amber' | 'rose' | 'blue';
type Float = { id: number; d: number };

/** Pixel bar from the UI kit; big jumps float a +n / −n label above it. */
function Bar({ ic, label, pct, fill, warn, goodUp = true }: { ic: string; label: string; pct: number; fill: Fill; warn?: boolean; goodUp?: boolean }) {
  const [prev, setPrev] = useState(pct);
  const [floats, setFloats] = useState<Float[]>([]);
  if (pct !== prev) {
    const d = Math.round(pct - prev);
    setPrev(pct);
    // Old floats have already faded out by CSS; keep only the last few.
    if (Math.abs(d) >= 3) setFloats((f) => [...f.slice(-2), { id: (f.at(-1)?.id ?? 0) + 1, d }]);
  }
  return (
    <div className="bar" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <Icon name={ic} />
      <div>
        <div className="bar-label">{label}</div>
        <div className={`bar-track${warn ? ' warn' : ''}`}><div className={`bar-fill fill-${fill}`} style={{ width: `${pct}%` }} /></div>
      </div>
      {floats.map((f) => (
        <span key={f.id} className={`float ${(f.d > 0) === goodUp ? 'good' : 'bad'}`}>{f.d > 0 ? `+${f.d}` : `−${-f.d}`}</span>
      ))}
    </div>
  );
}

const pct = (v: number | undefined, s: number) => Math.max(0, Math.min(100, ((v ?? s) / s) * 100));

export function Hud({ sol, row, t, lang, name, onLang, onSources, muted, onMute }: {
  sol: number; row?: Row; t: Strings; lang: Lang; name: string; onLang: () => void; onSources: () => void; muted: boolean; onMute: () => void;
}) {
  const [open, setOpen] = useState(false);
  const life = row?.life ?? 100;
  const power = row?.powerPct ?? 40;
  const dose = Math.min(100, row?.dose ?? 0);
  return (
    <header className="hud">
      <div className="hud-sol"><Portrait role="commander" mood={life < 25 ? 'sad' : 'neutral'} size={42} t={t} /><b key={sol} className="flip"><Term k="sol" t={t}>{t.ui.sol}</Term> {sol}</b><span className="hud-meta">{name && <em>{name}</em>}{formatDate(solDate(sol), lang)}</span></div>
      <button type="button" className="life-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Bar ic="heart" label={`${t.ui.life} ▾`} pct={life} fill="teal" warn={life < 25} />
      </button>
      {open && (
        <div className="life-pop" role="group" aria-label={t.ui.lifeParts}>
          <div className="muted">{t.ui.lifeParts}</div>
          <Bar ic="oxygen" label={t.ui.o2} pct={pct(row?.o2, P.o2Start)} fill="teal" />
          <Bar ic="water" label={t.ui.water} pct={pct(row?.water, P.waterStart)} fill="blue" />
          <Bar ic="apple" label={t.ui.food} pct={pct(row?.food, P.foodStart)} fill="teal" />
        </div>
      )}
      <Bar ic="energy" label={t.ui.power} pct={power} fill="amber" warn={power < 10} />
      <Bar ic="shield" label={t.ui.radiation} pct={dose} fill="rose" goodUp={false} warn={dose > 75} />
      <div className="hud-delay">
        <Icon name="signal" size={28} />
        <div><div className="muted">{t.ui.delay}</div><b className="num">{formatDelay(delaySeconds(sol), t)}</b></div>
      </div>
      <div className="hud-tools">
        <button type="button" className="tool" onClick={onLang} aria-label={t.lang === 'English' ? 'Tiếng Việt' : 'English'}>{t.ui.langSwitch}</button>
        <button type="button" className="tool" onClick={onMute} aria-pressed={!muted} aria-label={t.ui.sound}>{muted ? '🔇' : '🔊'}</button>
        <button type="button" className="tool" onClick={onSources} aria-label={t.ui.sources}>?</button>
      </div>
    </header>
  );
}

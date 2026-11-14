import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Choices, DecisionSol, Luck, Run } from '../engine/types';
import { alternative, biggestSplit, simulate } from '../engine/engine';
import { DECISION_SOLS, LAST_SOL } from '../engine/params';
import type { Strings } from '../i18n';
import { Chip, Icon, Modal, Portrait } from './bits';
import { cardsFor, endingFor } from './text';

const CACHE = 'solcrew.donki';
type Sun = { n: number; date: string; cached?: boolean };

/** Keyless DONKI endpoints first (DEMO_KEY allows few calls per hour), then the last good answer. */
async function fetchSep(signal: AbortSignal): Promise<Sun> {
  const end = new Date();
  const d = (x: Date) => x.toISOString().slice(0, 10);
  const q = `startDate=${d(new Date(end.getTime() - 30 * 864e5))}&endDate=${d(end)}`;
  const urls = [
    `https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?${q}`,
    `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP?${q}`,
    `https://api.nasa.gov/DONKI/SEP?${q}&api_key=DEMO_KEY`,
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u, { signal });
      if (!r.ok) continue;
      const text = await r.text();
      const j: unknown = text.trim() ? JSON.parse(text) : [];
      const sun = { n: Array.isArray(j) ? j.length : 0, date: d(end) };
      try { localStorage.setItem(CACHE, JSON.stringify(sun)); } catch { /* ignore */ }
      return sun;
    } catch (e) {
      if (signal.aborted) throw e;
    }
  }
  const saved = (() => { try { return localStorage.getItem(CACHE); } catch { return null; } })();
  if (saved) return { ...(JSON.parse(saved) as Sun), cached: true };
  // snapshot bundled at build time by `npm run snapshot`
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}donki-snapshot.json`, { signal });
    if (r.ok) return { ...((await r.json()) as Sun), cached: true };
  } catch (e) {
    if (signal.aborted) throw e;
  }
  throw new Error('DONKI unreachable');
}

function SunToday({ t }: { t: Strings }) {
  const [sun, setSun] = useState<Sun | null | 'fail'>(null);
  useEffect(() => {
    const ctl = new AbortController();
    fetchSep(ctl.signal).then(setSun).catch(() => !ctl.signal.aborted && setSun('fail'));
    return () => ctl.abort();
  }, []);
  const n = sun && sun !== 'fail' ? sun.n : null;
  const msg = sun === null ? t.end.sunLoading : sun === 'fail' ? t.end.sunFail
    : (n === 0 ? t.end.sunNone : t.end.sunCount.replace('{n}', String(n))) + (sun.cached ? ` (${sun.date})` : '');
  return (
    <div className="sun panel">
      <div className="panel-title"><Icon name="star" size={32} />{t.ui.sunToday} <Chip label="real" t={t} /></div>
      <p role="status">{msg}</p>
      <p className="sun-q">{t.end.sunQ}</p>
      <a href="https://ccmc.gsfc.nasa.gov/DONKI/" target="_blank" rel="noreferrer">NASA DONKI ↗</a>
    </div>
  );
}

export function EndScreen({ t, run, choices, luck, code, name, cert, onReport, onAgain }: { t: Strings; run: Run; choices: Choices; luck: Luck; code: number; name: string; cert?: ReactNode; onReport: () => void; onAgain: () => void }) {
  const ok = !run.fail;
  const last = run.rows[run.rows.length - 1];
  const key = useMemo(() => biggestSplit(choices, luck), [choices, luck]);
  const names = t.end.decisionNames as Record<string, string>;
  // a winning crew is never shown at 0%
  const lifeShown = Math.max(ok ? 1 : 0, Math.round(last?.life ?? 0));
  // ran out on the very last day: the ship was landing anyway
  const close = !!run.fail && run.fail.sol >= LAST_SOL;
  return (
    <div className="end">
      <div className="end-main panel">
        <div className="end-crew">
          {(['power', 'life', 'doctor', 'commander', 'scientist', 'rover', 'botanist'] as const).map((r, i) => (
            <div key={r} className="crew-slot" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
              <Portrait role={r} mood={ok ? (i % 3 === 1 ? 'surprised' : 'happy') : i % 2 ? 'sad' : 'neutral'} size={64} t={t} />
            </div>
          ))}
        </div>
        <div className="end-name">{t.roles.commander} {name}</div>
        <Chip label="scenario" t={t} />
        <h1>{ok && last ? t.end.endings[endingFor(last)] : close ? t.end.closeTitle : t.end.failTitle}</h1>
        {run.fail && close && <p className="end-sub">{t.end.closeWhy[run.fail.kind]}</p>}
        {run.fail && !close && <p className="end-sub">{t.end.rescued}</p>}
        {run.fail && !close && <p className="end-why">{t.end.why[run.fail.kind].replace('{sol}', String(run.fail.sol))}</p>}
        <p className="end-key">★ {t.end.keyChoice.replace('{name}', names[String(key)]).replace('{option}', choiceName(t, choices, key))}</p>
        <div className="end-stats">
          <span><Icon name="heart" size={28} />{lifeShown}%<small>{t.ui.life}</small></span>
          <span><Icon name="shield" size={28} />{Math.round(Math.min(100, last?.dose ?? 0))}%<small>{t.ui.radiation}</small></span>
          <span><Icon name="flask" size={28} />{Math.round(last?.sci ?? 0)}<small>{t.ui.discoveries}</small></span>
        </div>
        <p className="end-code">{t.end.missionCode.replaceAll('{code}', String(code))}</p>
        <div className="row">
          <button type="button" className="btn btn-amber big" onClick={onReport} autoFocus>{t.report.button}</button>
          {cert}
          <button type="button" className="btn btn-teal big" onClick={onAgain}>{t.ui.playAgain}</button>
        </div>
      </div>
      <div className="end-side">
        <div className="oppy panel">
          <div className="panel-title"><Icon name="signal" size={30} />{t.end.oppyTitle} <Chip label="real" t={t} /></div>
          <p>{t.end.oppy} {t.end.oppyNeed} <b>{ok ? t.end.oppyWin : t.end.oppyFail}</b></p>
        </div>
        <SunToday t={t} />
      </div>
    </div>
  );
}

function choiceName(t: Strings, c: Choices, s: DecisionSol): string {
  if (s === 4) return `${c[4] ?? 0} ${t.ui.inWall}`;
  return cardsFor(t, s).find((x) => x.id === c[s])?.title ?? '—';
}

const X0 = 60, X1 = 1100, Y0 = 36, Y1 = 300;
const sx = (sol: number) => X0 + ((sol - 1) / (LAST_SOL - 1)) * (X1 - X0);
const sy = (v: number) => Y1 - (v / 100) * (Y1 - Y0);
type Metric = 'life' | 'dose';
const val = (row: Run['rows'][number], m: Metric) => Math.min(100, m === 'life' ? row.life : row.dose);
const path = (r: Run, m: Metric) => r.rows.map((row, i) => `${i ? 'L' : 'M'}${sx(row.sol).toFixed(1)},${sy(val(row, m)).toFixed(1)}`).join('');

export function WhatIf({ t, choices, luck, initial, onAgain }: { t: Strings; choices: Choices; luck: Luck; initial?: DecisionSol; onAgain: () => void }) {
  const best = useMemo(() => biggestSplit(choices, luck), [choices, luck]);
  const [s, setS] = useState<DecisionSol>(initial ?? best);
  const [m, setM] = useState<Metric>('life');
  const alt = useMemo(() => alternative(choices, s), [choices, s]);
  const a = useMemo(() => simulate(choices, luck), [choices, luck]);
  const b = useMemo(() => simulate(alt, luck), [alt, luck]);
  const names = t.end.decisionNames as Record<string, string>;
  const end = (r: Run, cls: string) => {
    const l = r.rows[r.rows.length - 1];
    const y = sy(val(l, m));
    return r.fail
      ? <g className={cls}><circle cx={sx(l.sol)} cy={y} r={9} /><text x={sx(l.sol) + 14} y={y + 5}>✕</text></g>
      : <circle className={cls} cx={sx(l.sol)} cy={y} r={7} />;
  };
  return (
    <div className="whatif">
      <div className="eyebrow">{t.ui.whatIfEyebrow}</div>
      <h1>{t.ui.whatIfTitle}</h1>
      <div className="wi-pick" role="radiogroup" aria-label={t.ui.tryOther}>
        {DECISION_SOLS.map((d) => (
          <button type="button" key={d} role="radio" aria-checked={s === d} className={`pill${s === d ? ' on' : ''}`} onClick={() => setS(d as DecisionSol)}>
            {names[String(d)]}{d === best ? ' ★' : ''}
          </button>
        ))}
      </div>
      <div className="wi-legend">
        <span className="wi-metric" role="radiogroup">
          {(['life', 'dose'] as const).map((k) => (
            <button type="button" key={k} role="radio" aria-checked={m === k} className={`pill${m === k ? ' on' : ''}`} onClick={() => setM(k)}>
              {k === 'life' ? t.ui.life : t.ui.radiation}
            </button>
          ))}
        </span>
        <span className="you">● {t.ui.yourPath}: <b>{choiceName(t, choices, s)}</b></span>
        <span className="other">● {t.ui.otherPath}: <b>{choiceName(t, alt, s)}</b></span>
      </div>
      <svg viewBox="0 0 1160 340" className="wi-chart" role="img" aria-label={`${m === 'life' ? t.ui.chartLife : t.ui.chartDose}: ${t.ui.yourPath} / ${t.ui.otherPath}`}>
        <text x={X0 - 40} y={18} className="tick axis">{m === 'life' ? t.ui.chartLife : t.ui.chartDose}</text>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}><line x1={X0} x2={X1} y1={sy(v)} y2={sy(v)} className="grid" /><text x={X0 - 10} y={sy(v) + 5} className="tick" textAnchor="end">{v}</text></g>
        ))}
        {[1, 5, 10, 15, 20, 25, 30].map((v) => <text key={v} x={sx(v)} y={Y1 + 26} className="tick" textAnchor="middle">{t.ui.sol} {v}</text>)}
        <line x1={sx(s)} x2={sx(s)} y1={Y0 - 6} y2={Y1} className="turn" />
        <text x={sx(s) + 8} y={Y0 + 10} className="turn-label">{t.ui.turning}</text>
        <path d={path(b, m)} className="line other" />
        <path d={path(a, m)} className="line you" />
        {end(b, 'dot other')}
        {end(a, 'dot you')}
      </svg>
      <div className="row">
        <button type="button" className="btn btn-teal big" onClick={onAgain}>{t.ui.playAgain}</button>
      </div>
    </div>
  );
}

export function Sources({ t, onClose }: { t: Strings; onClose: () => void }) {
  const s = t.sources;
  return (
    <Modal title={s.title} onClose={onClose} closeText={t.ui.close}>
      <p className="kid">{s.kid}</p>
      <ul className="labels">
        {(['real', 'based', 'scenario', 'game'] as const).map((k) => <li key={k}><Chip label={k} t={t} /> {s.labels[k]}</li>)}
      </ul>
      <ul className="notes">{s.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      <dl className="words">{s.words.map(([w, d]) => <div key={w}><dt>{w}</dt><dd>{d}</dd></div>)}</dl>
      <h3>{s.dataTitle}</h3>
      <ul className="notes">{s.data.map(([n, url]) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{n} ↗</a></li>)}</ul>
      <h3>{s.creditsTitle}</h3>
      <ul className="notes">{s.credits.map((n) => <li key={n}>{n}</li>)}</ul>
    </Modal>
  );
}

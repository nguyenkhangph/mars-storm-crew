import { useEffect, useState } from 'react';
import type { DecisionSol, Label } from '../engine/types';
import { P } from '../engine/params';
import { delaySeconds } from '../data/delay';
import { formatDelay, type Strings } from '../i18n';
import { cardsFor, solText, type React } from './text';
import { plain } from '../i18n/plain';
import { Rich } from './Rich';
import { Bulletin, Chip, Icon, NextArrow, Portrait, Speaker } from './bits';
import { BULLETIN_LABEL, MOODS, SPEAKERS } from './meta';
import { hideMissing, sprite } from './assets';

export function Decide({ sol, t, low, tankFull, meters, onPick }: { sol: DecisionSol; t: Strings; low: boolean; tankFull: boolean; meters: boolean; onPick: (id: string) => void }) {
  const s = solText(t, sol);
  const [a, b] = SPEAKERS[sol];
  const cards = cardsFor(t, sol);
  const full = sol === 21 && tankFull;
  const bulletin = full ? t.sols['21'].bulletinFull : sol === 17 ? (meters ? t.sols['17'].bulletinBoth : t.sols['17'].bulletinOne) : s.bulletin;
  const lineA = full ? t.sols['21'].aFull : s.a.line;
  const lineB = full ? t.sols['21'].bFull : s.b.line;
  return (
    <>
      <Bulletin text={bulletin} label={BULLETIN_LABEL[sol]} t={t} />
      {low && <div className="low"><Icon name="alert" size={24} />{t.ui.dangerLow}</div>}
      <Speaker role={a} line={lineA} side="l" mood={MOODS[sol][0]} delay={450} t={t} />
      <Speaker role={b} line={lineB} side="r" mood={MOODS[sol][1]} delay={600 + plain(lineA).length * 30} t={t} />
      <div className="cards">
        {cards.length === 0 ? (
          <button type="button" className="card card-wide" onClick={() => onPick('wall')}>
            <span className="card-title"><Icon name="water" /> {t.ui.wallTitle} →</span>
            <span>{t.ui.wallLead}</span>
          </button>
        ) : cards.map((c) => (
          <button type="button" key={c.id} className="card" onClick={() => onPick(c.id)}>
            <span className="card-title">{c.title}</span>
            <span><b className="gain">{t.ui.gain}:</b> {c.gain}</span>
            <span><b className="lose">{t.ui.lose}:</b> {c.lose}</span>
          </button>
        ))}
      </div>
    </>
  );
}

const wallLevel = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : 3);

export function WallScreen({ t, water, onConfirm }: { t: Strings; water: number; onConfirm: (n: number) => void }) {
  const [n, setN] = useState(2);
  const lvl = wallLevel(n);
  const [title, body] = t.ui[`wall${lvl}` as 'wall0'];
  const tank = Math.max(0, Math.floor(water) - n);
  const border = 10 + n * 9;
  return (
    <div className="wall">
      <div className="wall-head">
        <h1>{t.ui.wallTitle}</h1>
        <p>{t.ui.wallLead}</p>
        <img className="px wall-tank-sprite" src={sprite('Large_Water_Tank.png')} alt="" onError={hideMissing} />
      </div>
      <div className="tank-col">
        <div className="col-title">{t.ui.tank}</div>
        <div className="tank"><div style={{ height: `${(tank / P.waterStart) * 100}%` }} /></div>
        <div className="col-num">{tank} {t.ui.parts}</div>
      </div>
      <div className="pm">
        <button type="button" className="btn btn-teal sq" disabled={n >= P.maxWall} onClick={() => setN(n + 1)} aria-label={t.ui.add}>+</button>
        <button type="button" className="btn btn-rose sq" disabled={n <= 0} onClick={() => setN(n - 1)} aria-label={t.ui.remove}>−</button>
      </div>
      <div className="shelter-col">
        <div className="col-title">{t.ui.shelter}</div>
        <div className="shelter" style={{ borderWidth: border }}>
          <div className="room">
            <Portrait role="commander" size={84} t={t} />
            <Portrait role="doctor" size={84} t={t} />
          </div>
        </div>
        <div className="col-num" aria-live="polite">{n} {t.ui.inWall}</div>
      </div>
      <div className="wall-side">
        <div className="panel"><div className="panel-title"><Icon name="shield" size={40} />{title}</div><p>{body}</p></div>
        <p className="wall-fact"><Rich text={t.sols['4'].after.default} t={t} /></p>
        <button type="button" className="btn btn-amber big" onClick={() => onConfirm(n)}>{t.ui.confirm}</button>
      </div>
    </div>
  );
}

/** Asking Earth: a few seconds in the game, the real light-time on Mars. */
export function AskScreen({ t, onDone }: { t: Strings; onDone: () => void }) {
  const total = 2 * Math.round(delaySeconds(17)); // question there, answer back
  const ms = 6000;
  const [left, setLeft] = useState(ms);
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => {
      const l = Math.max(0, ms - (performance.now() - t0));
      setLeft(l);
      if (l === 0) { clearInterval(id); onDone(); }
    }, 100);
    return () => clearInterval(id);
  }, [onDone]);
  return (
    <div className="ask" role="status" aria-live="polite">
      <Icon name="signal" size={64} />
      <h2>{t.ui.waiting}</h2>
      <div className="ask-count num">{formatDelay((left / ms) * total, t)}</div>
      <div className="ask-bar"><div style={{ width: `${100 - (left / ms) * 100}%` }} /></div>
      <p>{t.ui.waitNote} {formatDelay(total, t)}.</p>
      <div className="ask-mia"><Speaker role="botanist" line={t.ui.askMia} side="l" mood="surprised" delay={1200} t={t} /></div>
    </div>
  );
}

export function After({ t, text, label, extra, react, onNext }: { t: Strings; text: string; label: Label | null; extra?: string; react?: React; onNext: () => void }) {
  return (
    <div className="after">
      {react && (
        <div className="react">
          <Speaker role={react[0]} line={react[1]} side="l" mood={react[1].includes('?') ? 'surprised' : 'happy'} delay={250} t={t} />
        </div>
      )}
      <div className="panel">
        {label && <Chip label={label} t={t} />}
        <p className="after-text"><Rich text={text} t={t} /></p>
        {extra && <p className="after-extra"><Chip label="real" t={t} /> <Rich text={extra} t={t} /></p>}
        <button type="button" className="btn btn-amber big" onClick={onNext} autoFocus>{t.ui.next} <NextArrow /></button>
      </div>
    </div>
  );
}


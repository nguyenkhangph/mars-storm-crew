import { useEffect, useState } from 'react';
import type { Strings } from '../i18n';
import { Icon, Portrait } from './bits';
import { sfx } from './sound';
import { Rich } from './Rich';
import { plain } from '../i18n/plain';

const CREW = ['power', 'life', 'doctor', 'scientist', 'rover', 'botanist'] as const;
const SHOT_MS = 4600;

/**
 * The opening "film": seven short shots drawn with the game's own art,
 * captions typed out, auto-advancing. Tap to go on, or skip.
 */
export function Cutscene({ t, onShot, onDone }: { t: Strings; onShot: (k: string) => void; onDone: () => void }) {
  const shots = t.cutscene;
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const shot = shots[i];
  const text = plain(shot.text);

  useEffect(() => {
    onShot(shot.k);
    if (shot.k === 'logo') sfx.chime();
    else if (shot.k === 'signal') sfx.sad();
    else sfx.beep();
    let c = 0;
    const type = setInterval(() => {
      c += 1;
      setN(c);
      if (c % 3 === 0) sfx.blip();
      if (c >= text.length) clearInterval(type);
    }, 32);
    const next = setTimeout(() => (i + 1 < shots.length ? setI(i + 1) : onDone()), Math.max(SHOT_MS, text.length * 32 + 2200));
    return () => { clearInterval(type); clearTimeout(next); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, shots]);

  const advance = () => {
    if (n < text.length) { setN(text.length); return; }
    if (i + 1 < shots.length) { setN(0); setI(i + 1); } else onDone();
  };

  return (
    <div className="cut" onClick={advance} role="dialog" aria-label={t.ui.title}>
      {shot.k === 'space' && (
        <div className="cut-space">
          <div className="stars" />
          <div className="cut-planet"><div className="mars" /></div>
        </div>
      )}
      {shot.k === 'signal' && (
        <div className="cut-center cut-signal">
          <div className="signal-lost"><Icon name="signal" size={128} /></div>
          <div className="cut-tag">OPPORTUNITY · 10/06/2018</div>
        </div>
      )}
      {shot.k === 'crew' && (
        <div className="cut-center cut-crew">
          {CREW.map((r, k) => (
            <div key={r} className="crew-slot" style={{ animationDelay: `${0.2 + k * 0.25}s` }}>
              <Portrait role={r} size={96} mood={k % 2 ? 'neutral' : 'happy'} t={t} />
              <div className="cut-role">{t.roles[r]}</div>
            </div>
          ))}
        </div>
      )}
      {shot.k === 'commander' && (
        <div className="cut-center cut-commander">
          <Portrait role="commander" size={192} mood="happy" t={t} />
          <div className="cut-role big">{t.roles.commander}</div>
        </div>
      )}
      {shot.k === 'sol' && (
        <div className="cut-center cut-sol">
          <div className="sun-arc"><Icon name="star" size={64} /></div>
          <div className="sol-card">{t.ui.solCard}</div>
        </div>
      )}
      {shot.k === 'logo' && (
        <div className="cut-center">
          <h1 className="logo" data-text={t.ui.title}>{t.ui.title}</h1>
          <p className="cut-sub">{t.ui.subtitle}</p>
        </div>
      )}
      <div className="letterbox top" />
      <div className="letterbox bottom">
        <p className="cut-caption" aria-live="polite">
          {n >= text.length ? <Rich text={shot.text} t={t} /> : (
            <>
              <span>{text.slice(0, n)}</span>
              <span className="line-ghost">{text.slice(n)}</span>
            </>
          )}
        </p>
        <div className="cut-dots" aria-hidden>{shots.map((s, k) => <span key={s.k} className={k === i ? 'on' : ''} />)}</div>
      </div>
      <button type="button" className="btn btn-teal cut-skip" onClick={(e) => { e.stopPropagation(); onDone(); }}>{t.ui.skip}</button>
    </div>
  );
}

export function HowTo({ t, onBack, onPlay }: { t: Strings; onBack: () => void; onPlay: () => void }) {
  return (
    <div className="howto panel" role="dialog" aria-label={t.ui.howtoTitle}>
      <h2>{t.ui.howtoTitle}</h2>
      <p className="howto-lead">{t.ui.howtoLead}</p>
      <ol className="howto-grid">
        {t.howto.map((h) => (
          <li key={h.title}>
            <Icon name={h.icon} size={40} />
            <div><b>{h.title}</b><span>{h.text}</span></div>
          </li>
        ))}
      </ol>
      <div className="row">
        <button type="button" className="btn btn-teal big" onClick={onBack}>{t.ui.back}</button>
        <button type="button" className="btn btn-amber big" onClick={onPlay} autoFocus>{t.ui.play}</button>
      </div>
    </div>
  );
}

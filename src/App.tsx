import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Choices, DecisionSol, Label, Luck } from './engine/types';
import { luckFromSeed, simulate } from './engine/engine';
import { DECISION_SOLS, LAST_SOL, P } from './engine/params';
import { tau } from './data/tau';
import { STRINGS, formatDelay, type Lang } from './i18n';
import { delaySeconds } from './data/delay';
import { Scene, Stage } from './ui/bits';
import { Hud } from './ui/Hud';
import { After, AskScreen, Decide, WallScreen } from './ui/screens';
import { afterFor } from './ui/text';
import { EndScreen, Sources, WhatIf } from './ui/end';
import { ReportScreen } from './ui/Report';
import { CertButton } from './ui/CertButton';
import { endingFor } from './ui/text';
import { AFTER_LABEL, CUT_TAU } from './ui/meta';
import { isMuted, setMuted, sfx, wind } from './ui/sound';
import { Cutscene, HowTo } from './ui/Cutscene';
import { PickCommander } from './ui/Pick';
import { LOOKS, setCommanderLook, type Look } from './ui/assets';

type Phase = 'report' | 'splash' | 'cutscene' | 'menu' | 'howto' | 'pick' | 'travel' | 'event' | 'decide' | 'wall' | 'ask' | 'after' | 'end' | 'whatif';
const TICK_MS = 420;
/** ?seed=123 replays the same luck (handy for demos); otherwise each game differs. */
const newSeed = () => {
  const q = Number(new URLSearchParams(location.search).get('seed'));
  return Number.isInteger(q) && q > 0 ? q : 10000 + Math.floor(Math.random() * 90000);
};
const nextDecision = (sol: number) => (DECISION_SOLS as readonly number[]).find((d) => d > sol) ?? LAST_SOL;

function initialLook(): Look {
  let l: Look = 'captain-ada';
  try {
    const s = localStorage.getItem('solcrew.look');
    if (s && (LOOKS as readonly string[]).includes(s)) l = s as Look;
  } catch { /* ignore */ }
  setCommanderLook(l);
  return l;
}

function initialLang(): Lang {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'vi' || q === 'en') return q;
    const s = localStorage.getItem('solcrew.lang');
    if (s === 'vi' || s === 'en') return s;
  } catch { /* storage may be blocked */ }
  return 'en';
}

export default function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = STRINGS[lang];
  const [phase, setPhase] = useState<Phase>('splash');
  const [shot, setShot] = useState('space');
  const [focusSol, setFocusSol] = useState<DecisionSol | undefined>();
  const [look, setLook] = useState<Look>(initialLook);
  const [cmdName, setCmdName] = useState(() => { try { return localStorage.getItem('solcrew.name') ?? ''; } catch { return ''; } });
  const chooseLook = (l: Look, name = '') => {
    setCmdName(name);
    try { localStorage.setItem('solcrew.name', name); } catch { /* ignore */ }
    setCommanderLook(l);
    setLook(l);
    try { localStorage.setItem('solcrew.look', l); } catch { /* ignore */ }
    start();
  };
  const [sol, setSol] = useState(1);
  const [target, setTarget] = useState(4);
  const [choices, setChoices] = useState<Choices>({});
  const [seed, setSeed] = useState(newSeed);
  const luck = useMemo<Luck>(() => luckFromSeed(seed), [seed]);
  const [sources, setSources] = useState(false);
  const [seenStorm2, setSeenStorm2] = useState(false);
  const [eventKind, setEventKind] = useState<'storm2' | 'news' | 'skip21'>('storm2');
  const [muted, setMutedState] = useState(isMuted);
  const toggleMute = () => { setMuted(!muted); setMutedState(!muted); };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lang === 'vi' ? 'Vượt Bão Sao Hỏa' : 'Mars Storm Crew';
    try { localStorage.setItem('solcrew.lang', lang); } catch { /* ignore */ }
  }, [lang]);

  const run = useMemo(() => simulate(choices, luck, sol), [choices, luck, sol]);
  const row = run.rows[run.rows.length - 1];
  const full = useMemo(() => simulate(choices, luck), [choices, luck]);

  // Sols tick by between decisions; stop early if the station fails.
  useEffect(() => {
    if (phase !== 'travel') return;
    const id = setTimeout(() => {
      if (run.fail) return setPhase('end');
      if (sol >= target) {
        if (target === LAST_SOL) return setPhase('end');
        // nothing to take back from an empty wall: skip day 21
        if (target === 21 && (row?.wall ?? 0) < 0.5) {
          setChoices((c) => ({ ...c, 21: 'keep' }));
          setEventKind('skip21');
          return setPhase('event');
        }
        return setPhase('decide');
      }
      if (sol === P.sep2Sol && !seenStorm2) {
        setSeenStorm2(true);
        setEventKind(luck.secondStorm ? 'storm2' : 'news');
        return setPhase('event');
      }
      sfx.tick();
      setSol(sol + 1);
    }, TICK_MS);
    return () => clearTimeout(id);
  }, [phase, sol, target, run.fail, luck, seenStorm2, row]);

  const travelTo = (to: number) => { setTarget(to); setPhase('travel'); };
  const start = () => {
    setChoices({}); setSeed(newSeed()); setSol(1); setSeenStorm2(false); travelTo(4);
  };

  const choose = (s: DecisionSol, v: Choices[DecisionSol]) => {
    setChoices((c) => ({ ...c, [s]: v }));
    setPhase('after');
  };
  const onPick = (id: string) => {
    const s = sol as DecisionSol;
    if (s === 4) return setPhase('wall');
    if (s === 17 && id === 'ask') { setChoices((c) => ({ ...c, 17: 'ask' })); return setPhase('ask'); }
    choose(s, id as Choices[DecisionSol]);
  };
  const askDone = useCallback(() => setPhase('after'), []);

  const ds = sol as DecisionSol;
  let afterLabel: Label | null = AFTER_LABEL[ds] ?? null;
  if (ds === 17) afterLabel = luck.falseAlarm ? 'scenario' : 'based';
  const after = phase === 'after' ? afterFor(t, ds, choices, luck, (row?.water ?? 0) > P.waterStart * 0.5) : null;

  const showHud = !['splash', 'cutscene', 'menu', 'howto', 'pick', 'end', 'report', 'whatif'].includes(phase);
  const overlay = ['ask', 'after', 'event', 'end', 'report', 'whatif', 'howto', 'pick'].includes(phase);
  const dim = phase === 'wall' ? 0.6 : overlay ? 0.3 : 0;
  const alert = (phase === 'event' && eventKind === 'storm2') || (phase === 'after' && ds === 17 && !luck.falseAlarm);
  const ending = phase === 'end' ? (full.fail ? 'sad' : 'win') : null;
  const sceneTau = phase === 'cutscene' ? CUT_TAU[shot] ?? 0.5 : ['menu', 'howto', 'splash', 'pick'].includes(phase) ? 6 : tau(sol);
  const storm = Math.max(0, Math.min(1, (sceneTau - 0.5) / 8));

  // Sounds follow the story; all synthesized, muted with the 🔊 button.
  useEffect(() => { if (phase !== 'splash') wind(storm); }, [storm, phase]);
  useEffect(() => {
    if (phase === 'decide') (sol === 17 ? sfx.alarm : sfx.beep)();
    if (alert) sfx.alarm();
  }, [phase, sol, alert]);
  useEffect(() => { if (ending) (ending === 'win' ? sfx.chime : sfx.sad)(); }, [ending]);
  const lastRow = full.rows.at(-1);
  const endingText = !full.fail && lastRow ? t.end.endings[endingFor(lastRow)]
    : full.fail && full.fail.sol >= LAST_SOL ? t.end.closeTitle : t.end.failTitle;
  const cert = phase === 'end' || phase === 'report'
    ? <CertButton t={t} lang={lang} name={cmdName} look={look} choices={choices} luck={luck} code={seed} won={!full.fail} ending={endingText} />
    : null;
  const tools = (
    <>
      <button type="button" className="tool" onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}>{t.ui.langSwitch}</button>
      <button type="button" className="tool" onClick={toggleMute} aria-pressed={!muted} aria-label={t.ui.sound}>{muted ? '🔇' : '🔊'}</button>
      <button type="button" className="tool" onClick={() => setSources(true)} aria-label={t.ui.sources}>?</button>
    </>
  );

  return (
    <>
    <Stage className={alert ? 'shake' : ''}>
      <div onClickCapture={(e) => { if ((e.target as HTMLElement).closest('button')) sfx.click(); }}>
      <Scene tau={sceneTau} dim={dim} blur={overlay} pan={phase === 'menu' || phase === 'cutscene' || phase === 'splash'} />
      {phase === 'travel' && <div key={sol} className="night" aria-hidden />}
      {alert && <div className="alert-flash" aria-hidden />}
      {showHud && (
        <Hud sol={sol} row={row} t={t} lang={lang} name={cmdName} onLang={() => setLang(lang === 'en' ? 'vi' : 'en')} onSources={() => setSources(true)} muted={muted} onMute={toggleMute} />
      )}
      {!showHud && (
        <div className="corner-tools">{tools}</div>
      )}

      {phase === 'splash' && (
        <div className="splash" onClick={() => setPhase('cutscene')}>
          <button type="button" className="play-big" aria-label={t.ui.start} autoFocus>▶</button>
          <p>{t.ui.tapNext}</p>
        </div>
      )}
      {phase === 'cutscene' && <Cutscene t={t} onShot={setShot} onDone={() => setPhase('menu')} />}
      {phase === 'menu' && (
        <div className="title">
          <h1 className="logo" data-text={t.ui.title}>{t.ui.title}</h1>
          <p>{t.ui.subtitle}</p>
          <div className="menu">
            <button type="button" className="btn btn-amber big" onClick={() => setPhase('pick')} autoFocus>{t.ui.start}</button>
            <button type="button" className="btn btn-teal" onClick={() => setPhase('howto')}>{t.ui.howto}</button>
            <button type="button" className="btn btn-teal" onClick={() => setPhase('cutscene')}>{t.ui.watchIntro}</button>
            <button type="button" className="btn btn-teal" onClick={() => setSources(true)}>{t.ui.sources}</button>
          </div>
          <div className="title-badge">NASA Space Apps 2026 · Junior Astronaut Mission Trainer</div>
        </div>
      )}
      {phase === 'howto' && <HowTo t={t} onBack={() => setPhase('menu')} onPlay={() => setPhase('pick')} />}
      {phase === 'pick' && <PickCommander t={t} initial={look} initialName={cmdName} onBack={() => setPhase('menu')} onGo={chooseLook} />}
      {phase === 'travel' && <div className="travel" aria-live="polite">{t.ui.traveling}</div>}
      {phase === 'decide' && <Decide key={sol} sol={ds} t={t} low={(row?.life ?? 100) < 25} tankFull={(row?.water ?? 0) > P.waterStart * 0.5} meters={luck.falseAlarm ? luck.hintCorrect === false : luck.hintCorrect !== false} onPick={onPick} />}
      {phase === 'wall' && <WallScreen t={t} water={row?.water ?? P.waterStart} onConfirm={(n) => choose(4, n)} />}
      {phase === 'ask' && <AskScreen t={t} onDone={askDone} />}
      {phase === 'after' && after && (
        <After t={t} text={after.text} extra={after.extra} react={after.react} label={afterLabel} onNext={() => travelTo(nextDecision(sol))} />
      )}
      {phase === 'end' && <EndScreen t={t} run={full} choices={choices} luck={luck} code={seed} name={cmdName} cert={cert} onReport={() => setPhase('report')} onAgain={start} />}
      {phase === 'report' && <ReportScreen t={t} choices={choices} luck={luck} cert={cert} onWhatIf={(s) => { setFocusSol(s); setPhase('whatif'); }} onAgain={start} />}
      {phase === 'whatif' && <WhatIf t={t} choices={choices} luck={luck} initial={focusSol} onAgain={start} />}
      {phase === 'event' && (
        <After
          t={t}
          label={eventKind === 'skip21' ? null : 'scenario'}
          text={eventKind === 'skip21' ? t.ui.skip21
            : eventKind === 'news' ? t.ui.goodNews.replace('{delay}', formatDelay(delaySeconds(sol), t))
            : (row?.wall ?? 0) >= 0.5 ? t.ui.storm2 : t.ui.storm2NoWall}
          onNext={() => (eventKind === 'skip21' ? travelTo(26) : (setSol(sol + 1), setPhase('travel')))}
        />
      )}
      {sources && <Sources t={t} onClose={() => setSources(false)} />}
      </div>
    </Stage>
    <div className="rotate" role="alert">{t.ui.rotate}</div>
    </>
  );
}

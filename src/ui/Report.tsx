import { useMemo, type ReactNode } from 'react';
import type { Choices, DecisionSol, Luck } from '../engine/types';
import { debrief, madeCount, type Pick } from '../engine/debrief';
import type { Strings } from '../i18n';
import { Icon } from './bits';
import { cardsFor } from './text';

const CRIT = [['safety', 'heart'], ['radiation', 'shield'], ['science', 'flask'], ['wise', 'star']] as const;

function optName(t: Strings, s: DecisionSol, o: string | number) {
  if (s === 4) return t.report.wall.replace('{n}', String(o));
  return cardsFor(t, s).find((c) => c.id === o)?.title ?? String(o);
}

function PickRow({ t, p, kind }: { t: Strings; p: Pick; kind: 'best' | 'rethink' }) {
  const names = t.end.decisionNames as Record<string, string>;
  const tpl = (kind === 'best' ? t.report.effect : t.report.maybe) as Record<string, string>;
  const what = kind === 'best'
    ? optName(t, p.sol, p.chosen)
    : t.report.instead.replace('{other}', optName(t, p.sol, p.other)).replace('{chosen}', optName(t, p.sol, p.chosen));
  const why = tpl[p.effect.kind].replace('{n}', String(p.effect.amount)).replace('{sol}', String(p.effect.sol ?? ''));
  return (
    <div className={`pick-row ${kind}`}>
      <Icon name={kind === 'best' ? 'check' : 'gear'} size={36} />
      <div>
        <div className="pick-row-title">{kind === 'best' ? t.report.best : t.report.rethink} · {names[String(p.sol)]}</div>
        <div><b>{what}.</b> {why}</div>
      </div>
    </div>
  );
}

/** End-of-mission report: four star ratings, best choice, one to retry, a badge. */
export function ReportScreen({ t, choices, luck, cert, onWhatIf, onAgain }: { t: Strings; choices: Choices; luck: Luck; cert?: ReactNode; onWhatIf: (s?: DecisionSol) => void; onAgain: () => void }) {
  const d = useMemo(() => debrief(choices, luck), [choices, luck]);
  const m = madeCount(choices, luck);
  const [badgeName, badgeLine] = t.report.badges[d.badge];
  return (
    <div className="report panel" role="dialog" aria-label={t.report.title}>
      <h2>{t.report.title}</h2>
      <p className="report-lead">{t.report.lead}</p>
      <div className="crit-row">
        {CRIT.map(([k, ic], i) => {
          const c = t.report.criteria[k];
          const n = d.stars[k];
          return (
            <div key={k} className="crit" style={{ animationDelay: `${0.1 + i * 0.15}s` }}>
              <Icon name={ic} size={40} />
              <div className="crit-name">{c.name}</div>
              <div className="crit-stars" aria-label={`${n}/3`}>{[1, 2, 3].map((s) => <span key={s} className={s <= n ? 'on' : ''}>★</span>)}</div>
              <div className="crit-line">{c[String(n) as '1'].replace('{n}', String(d.wiseCount)).replace('{m}', String(m))}</div>
            </div>
          );
        })}
      </div>
      <div className="report-bottom">
        <div className="report-picks">
          {d.best && <PickRow t={t} p={d.best} kind="best" />}
          {d.rethink ? <PickRow t={t} p={d.rethink} kind="rethink" /> : <div className="pick-row best"><Icon name="star" size={36} /><div>{t.report.allBest}</div></div>}
        </div>
        <div className="badge">
          <div className="badge-medal"><Icon name="star" size={48} /></div>
          <div className="badge-title">{t.report.badgeTitle}</div>
          <b>{badgeName}</b>
          <span>{badgeLine}</span>
        </div>
      </div>
      <div className="row">
        <button type="button" className="btn btn-amber big" onClick={() => onWhatIf(d.rethink?.sol)} autoFocus>{t.report.seeWhatIf}</button>
        {cert}
        <button type="button" className="btn btn-teal big" onClick={onAgain}>{t.ui.playAgain}</button>
      </div>
    </div>
  );
}

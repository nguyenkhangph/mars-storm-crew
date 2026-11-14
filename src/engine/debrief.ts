import { DECISION_SOLS, P } from './params';
import { OPTIONS, finalScore, simulate } from './engine';
import type { Choices, DecisionSol, Luck, Run } from './types';

export type Stars = 1 | 2 | 3;
export type Effect = { kind: 'saved' | 'dose' | 'life' | 'sci'; amount: number; sol?: number };
export type Pick = { sol: DecisionSol; chosen: string | number; other: string | number; effect: Effect };
export type Badge = 'scientist' | 'wallBuilder' | 'careful' | 'gardener' | 'explorer' | 'brave';
export type Debrief = {
  stars: { safety: Stars; radiation: Stars; science: Stars; wise: Stars };
  wiseCount: number;
  best: Pick | null;
  rethink: Pick | null;
  badge: Badge;
  last: { life: number; dose: number; sci: number };
  failed: boolean;
};

const optionsFor = (s: DecisionSol): (string | number)[] =>
  s === 4 ? Array.from({ length: P.maxWall + 1 }, (_, i) => i) : [...(OPTIONS[s] as readonly string[])];

/** What changed most between two runs, from the point of view of run `a`. */
function effect(a: Run, b: Run): Effect {
  if (!a.fail && b.fail) return { kind: 'saved', amount: 0, sol: b.fail.sol };
  const la = a.rows.at(-1)!, lb = b.rows.at(-1)!;
  const dDose = Math.round(lb.dose - la.dose);
  const dLife = Math.round(la.life - lb.life);
  const dSci = Math.round(la.sci - lb.sci);
  const best = [
    { kind: 'dose' as const, amount: dDose, w: dDose },
    { kind: 'life' as const, amount: dLife, w: dLife * 1.5 },
    { kind: 'sci' as const, amount: dSci, w: dSci * 0.6 },
  ].sort((x, y) => y.w - x.w)[0];
  return { kind: best.kind, amount: Math.max(1, best.amount) };
}

type World = { luck: Luck; w: number };

/**
 * The luck worlds a player could not tell apart when deciding on day `s`.
 * Before day 17 nobody knows if the alarm will be real or if a second storm
 * comes; on day 17 only the meter clue is known; the second storm (day 24)
 * stays unknown until it happens.
 */
export function worldsAt(s: DecisionSol, luck: Luck): World[] {
  const pFalse = P.falseAlarmP, pS2 = P.sep2P, acc = P.hintAccuracy;
  const storms = s >= 26 ? [{ v: luck.secondStorm, w: 1 }] : [{ v: true, w: pS2 }, { v: false, w: 1 - pS2 }];
  let alarms: { v: boolean; w: number }[];
  if (s < 17) alarms = [{ v: true, w: pFalse }, { v: false, w: 1 - pFalse }];
  else if (s === 17) {
    const saysReal = luck.falseAlarm ? luck.hintCorrect === false : luck.hintCorrect !== false;
    const wFalse = pFalse * (saysReal ? 1 - acc : acc);
    const wReal = (1 - pFalse) * (saysReal ? acc : 1 - acc);
    alarms = [{ v: true, w: wFalse / (wFalse + wReal) }, { v: false, w: wReal / (wFalse + wReal) }];
  } else alarms = [{ v: luck.falseAlarm, w: 1 }];
  return alarms.flatMap((a) => storms.map((st) => ({ luck: { ...luck, falseAlarm: a.v, secondStorm: st.v }, w: a.w * st.w })));
}

export const expected = (c: Choices, worlds: World[]) => worlds.reduce((sum, { luck, w }) => sum + w * finalScore(simulate(c, luck)), 0);

/** Day 21 is skipped when the water wall is empty: it was never a real choice. */
const skipped = (run: Run, s: DecisionSol) => s === 21 && (run.rows[19]?.wall ?? 0) < 0.5;

/**
 * Mission report computed by replaying the game. A choice is judged by what
 * the player could know at that moment (expected result over the luck still
 * hidden), not by hindsight. The effects shown use the real run. No AI.
 */
export function debrief(c: Choices, luck: Luck): Debrief {
  const run = simulate(c, luck);
  const last = run.rows.at(-1)!;
  let wiseCount = 0;
  let best: (Pick & { gap: number }) | null = null;
  let rethink: (Pick & { gap: number }) | null = null;

  for (const s of DECISION_SOLS as readonly DecisionSol[]) {
    const chosen = c[s];
    if (chosen === undefined || skipped(run, s)) continue;
    // a decision made after the station failed never happened
    if (run.fail && run.fail.sol < s) continue;
    const worlds = worldsAt(s, luck);
    const mine = expected(c, worlds);
    const alts = optionsFor(s).filter((o) => o !== chosen).map((o) => {
      const alt = { ...c, [s]: o } as Choices;
      return { o, exp: expected(alt, worlds), r: simulate(alt, luck) };
    });
    if (mine >= Math.max(...alts.map((a) => a.exp)) - 1) wiseCount++;
    const worst = alts.reduce((x, y) => (y.exp < x.exp ? y : x));
    const better = alts.reduce((x, y) => (y.exp > x.exp ? y : x));
    const realGain = (r: Run, ref: Run) => finalScore(r) - finalScore(ref);
    // praise only what was wise AND helped in this run; suggest only what was wiser AND would have helped
    if (mine - worst.exp > 1 && realGain(run, worst.r) > 1 && (!best || mine - worst.exp > best.gap))
      best = { sol: s, chosen, other: worst.o, effect: effect(run, worst.r), gap: mine - worst.exp };
    if (better.exp - mine > 1 && realGain(better.r, run) > 1 && (!rethink || better.exp - mine > rethink.gap))
      rethink = { sol: s, chosen, other: better.o, effect: effect(better.r, run), gap: better.exp - mine };
  }

  const made = (DECISION_SOLS as readonly DecisionSol[]).filter((s) => c[s] !== undefined && !skipped(run, s) && !(run.fail && run.fail.sol < s)).length || 1;
  const ratio = wiseCount / made;
  const stars = {
    safety: (run.fail ? 1 : last.life >= 12 ? 3 : 2) as Stars,
    radiation: (last.dose >= 63 || run.fail?.kind === 'dose' ? 1 : last.dose >= 40 ? 2 : 3) as Stars,
    science: (last.sci >= 50 ? 3 : last.sci >= 38 ? 2 : 1) as Stars,
    wise: (ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1) as Stars,
  };
  const badge: Badge = last.sci >= 50 ? 'scientist'
    : (c[4] ?? 0) >= 4 ? 'wallBuilder'
    : c[17] === 'shelter' ? 'careful'
    : c[14] === 'keep' ? 'gardener'
    : c[8] === 'ice' ? 'explorer' : 'brave';
  const strip = (p: (Pick & { gap: number }) | null): Pick | null => (p ? { sol: p.sol, chosen: p.chosen, other: p.other, effect: p.effect } : null);
  return { stars, wiseCount, best: strip(best), rethink: strip(rethink), badge, last: { life: last.life, dose: last.dose, sci: last.sci }, failed: !!run.fail };
}

/** Decisions that were actually played (the station may fail early). */
export const madeCount = (c: Choices, luck: Luck) => {
  const run = simulate(c, luck);
  return (DECISION_SOLS as readonly DecisionSol[]).filter((s) => c[s] !== undefined && !skipped(run, s) && !(run.fail && run.fail.sol < s)).length;
};

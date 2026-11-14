import { P, LAST_SOL } from './params';
import { tau } from '../data/tau';
import type { Choices, Luck, Row, Run, Failure } from './types';

/** Small deterministic RNG so a run and its What-if share the same luck. */
export function luckFromSeed(seed: number): Luck {
  let s = seed >>> 0 || 1;
  const next = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  return { falseAlarm: next() < P.falseAlarmP, secondStorm: next() < P.sep2P, hintCorrect: next() < P.hintAccuracy };
}

const SPLIT = { safety: [0.8, 0.07], science: [0.6, 0.2], reserve: [0.5, 0] } as const;

/** Pure simulation: same choices and luck always give the same run. */
export function simulate(c: Choices, luck: Luck, untilSol = LAST_SOL): Run {
  const x: Record<'batt' | 'o2' | 'water' | 'food' | 'wall' | 'dose' | 'sci' | 'dirt', number> = { batt: P.battStart, o2: P.o2Start, water: P.waterStart, food: P.foodStart, wall: 0, dose: 0, sci: 0, dirt: 0 };
  let safe = 0.5;
  let sci = 0.3;
  let greenhouse = 1; // 1 lamps on, 0.5 dimmed, 0 off
  const rows: Row[] = [];
  let fail: Run['fail'] = null;
  const shield = () => Math.exp(-x.wall / P.wallK) * P.shelterFactor;

  for (let sol = 1; sol <= untilSol; sol++) {
    let extraKwh = 0;
    if (sol === 4 && c[4] !== undefined) {
      const n = Math.max(0, Math.min(P.maxWall, c[4]));
      x.water -= n;
      x.wall += n;
    }
    if (sol === 8 && c[8]) {
      if (c[8] === 'science') x.sci += P.sciStay;
      else {
        x.dose += P.evaDose;
        extraKwh += P.evaKwh;
        if (c[8] === 'ice') x.water += P.iceGain;
        else x.wall += P.bagWall;
      }
    }
    if (sol === 11 && c[11]) [safe, sci] = SPLIT[c[11]];
    if (sol === 14 && c[14]) greenhouse = c[14] === 'keep' ? 1 : c[14] === 'dim' ? 0.5 : 0;
    if (sol === 17 && c[17]) {
      if (luck.falseAlarm) {
        if (c[17] === 'shelter') {
          x.sci -= 8;
          x.batt = Math.max(0, x.batt - P.shelterKwh);
        }
      } else if (c[17] === 'shelter') x.dose += P.sepDose * shield();
      else x.dose += P.sepDose * (P.delayLeak + (1 - P.delayLeak) * shield());
    }
    if (sol === 21 && c[21] === 'drain') {
      const n = Math.min(3, x.wall);
      x.wall -= n;
      x.water += n;
    }
    if (sol === 26 && c[26]) {
      if (c[26] === 'clean') {
        x.dirt = 0;
        x.dose += P.evaDose;
        extraKwh += P.cleanKwh;
      } else {
        x.sci += P.sciBurst;
        extraKwh += P.burstKwh;
      }
    }
    if (sol === P.sep2Sol && luck.secondStorm) x.dose += P.sep2Dose * shield();

    const t = tau(sol);
    const gen = P.baseKwh + P.E0 * Math.exp(-P.dustK * t) * (1 - x.dirt);
    if (t > 2) x.dirt = Math.min(P.dirtMax, x.dirt + P.dirtRate * t);
    const allow = gen + P.draw * x.batt;
    const need = P.lifeKwh + greenhouse * P.greenhouseKwh;
    const rr = Math.min(1, (safe * allow) / need);
    x.batt = Math.min(P.battCap, Math.max(0, x.batt + gen - Math.min(safe * allow, need) - sci * allow - extraKwh));
    x.sci += sci * allow * P.sciPerKwh;
    x.dose += P.bgDose;
    x.o2 += -1 + rr;
    x.water -= P.waterUse + P.waterElec * rr + (1 - rr) * 0.3;
    x.food += -(P.foodUse + P.foodCold * (1 - rr)) + greenhouse * P.foodGreenhouse * rr;

    const pct = (v: number, s: number) => Math.max(0, Math.min(100, (v / s) * 100));
    rows.push({
      sol, tau: t, power: gen, batt: x.batt, o2: x.o2, water: x.water, food: x.food, wall: x.wall, dose: x.dose, sci: x.sci,
      life: Math.min(pct(x.o2, P.o2Start), pct(x.water, P.waterStart), pct(x.food, P.foodStart)),
      powerPct: pct(x.batt, P.battCap),
    });
    const out: [Failure, boolean][] = [['o2', x.o2 <= 0], ['water', x.water <= 0], ['food', x.food <= 0], ['dose', x.dose > 100]];
    const hit = out.find(([, b]) => b);
    if (hit) {
      fail = { kind: hit[0], sol };
      break;
    }
  }
  return { rows, fail };
}

export const OPTIONS = {
  8: ['ice', 'bags', 'science'],
  11: ['safety', 'science', 'reserve'],
  14: ['keep', 'dim', 'off'],
  17: ['shelter', 'ask'],
  21: ['keep', 'drain'],
  26: ['clean', 'burst'],
} as const;

/** The one changed choice that pulls the two futures furthest apart. */
export function alternative(c: Choices, sol: keyof Choices): Choices {
  if (sol === 4) return { ...c, 4: (c[4] ?? 0) > 0 ? 0 : 3 };
  const opts = OPTIONS[sol] as readonly string[];
  const other = opts.find((o) => o !== c[sol]) ?? opts[0];
  return { ...c, [sol]: other };
}

export function finalScore(r: Run): number {
  const last = r.rows[r.rows.length - 1];
  return (r.fail ? -100 + r.fail.sol : 0) + (last?.life ?? 0) - (last?.dose ?? 0) * 0.2;
}

export function biggestSplit(c: Choices, luck: Luck): keyof Choices {
  const base = finalScore(simulate(c, luck));
  let best: keyof Choices = 21;
  let gap = -1;
  for (const s of [4, 8, 11, 14, 17, 21, 26] as (keyof Choices)[]) {
    const g = Math.abs(finalScore(simulate(alternative(c, s), luck)) - base);
    if (g > gap) [gap, best] = [g, s];
  }
  return best;
}

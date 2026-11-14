import type { Choices, DecisionSol, Luck } from '../engine/types';
import { faceOf, type Role } from './assets';
import { delaySeconds } from '../data/delay';
import { formatDelay, type Strings } from '../i18n';

export type SolKey = '4' | '8' | '11' | '14' | '17' | '21' | '26';
export const solText = (t: Strings, s: DecisionSol) => t.sols[String(s) as SolKey];

export type Card = { id: string; title: string; gain: string; lose: string };
export function cardsFor(t: Strings, s: DecisionSol): Card[] {
  const c = solText(t, s).cards as Record<string, string[]>;
  return Object.entries(c).map(([id, [title, gain, lose]]) => ({
    id, title, gain, lose: lose.replace('{delay}', formatDelay(delaySeconds(s), t)),
  }));
}

/** Three ways to win, read from the last sol. Thresholds split winning runs about evenly. */
export type Ending = 'radiation' | 'explorers' | 'strong' | 'close';
export function endingFor(last: { dose: number; sci: number; life: number }): Ending {
  if (last.dose >= 63) return 'radiation';
  if (last.sci >= 50) return 'explorers';
  if (last.life >= 12) return 'strong';
  return 'close';
}

/** "Rosa · Power engineer" (the Commander has no name: that's the player). */
export const whoLabel = (t: Strings, r: Role) => {
  if (r === 'commander') return t.roles[r];
  const n = (t.names as Record<string, string>)[faceOf(r)];
  return n ? `${n} · ${t.roles[r]}` : t.roles[r];
};

export type React = [Role, string];
export type AfterText = { text: string; extra?: string; react?: React };

export function afterFor(t: Strings, sol: DecisionSol, c: Choices, luck: Luck, tankFull = false): AfterText {
  const day = solText(t, sol);
  const a = day.after as Record<string, string>;
  const r = (day as unknown as { react?: Record<string, string[]> }).react;
  // a few reactions depend on what just happened
  const key = sol === 17 && c[17] === 'shelter' && luck.falseAlarm ? 'shelterFalse'
    : sol === 21 && c[21] === 'keep' && tankFull ? 'keepFull' : String(c[sol]);
  const pick = r?.[key] ?? r?.[String(c[sol])] ?? r?.default;
  const react = pick ? ([pick[0] as Role, pick[1]] as React) : undefined;
  if (sol === 17) {
    // the meter clue is right 4 times out of 5; say so when it misled
    const clue = luck.hintCorrect === false ? ` ${a.clueWrong}` : '';
    return luck.falseAlarm
      ? { text: (c[17] === 'shelter' ? a.falseShelter : a.false) + clue, react }
      : { text: a.real + clue, extra: a.source, react };
  }
  if (sol === 8 || sol === 14) return { text: a[c[sol] as string], extra: sol === 14 ? a.source : undefined, react };
  return { text: a.default, react };
}

import { describe, expect, it } from 'vitest';
import { simulate } from './engine';
import type { Choices, Luck } from './types';

const ALL: Choices[] = [];
for (const w of [0, 3, 6])
  for (const a of ['ice', 'bags', 'science'] as const)
    for (const b of ['safety', 'science', 'reserve'] as const)
      for (const g of ['keep', 'off'] as const)
        for (const s of ['shelter', 'ask'] as const)
          for (const d of ['keep', 'drain'] as const)
            for (const e of ['clean', 'burst'] as const) ALL.push({ 4: w, 8: a, 11: b, 14: g, 17: s, 21: d, 26: e });
const LUCK: [Luck, number][] = [
  [{ falseAlarm: true, secondStorm: false }, 0.35 * 0.7],
  [{ falseAlarm: true, secondStorm: true }, 0.35 * 0.3],
  [{ falseAlarm: false, secondStorm: false }, 0.65 * 0.7],
  [{ falseAlarm: false, secondStorm: true }, 0.65 * 0.3],
];
const winRate = (c: Choices) => LUCK.reduce((s, [l, p]) => s + (simulate(c, l).fail ? 0 : p), 0);

describe('balance', () => {
  it('is deterministic', () => {
    expect(simulate(ALL[7], LUCK[0][0])).toEqual(simulate(ALL[7], LUCK[0][0]));
  });
  it('wins about half the games, never always', () => {
    const rates = ALL.map(winRate);
    const mean = rates.reduce((x, y) => x + y, 0) / rates.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.65);
    expect(Math.max(...rates)).toBeLessThanOrEqual(1);
  });
  it('playing only safe runs out of water', () => {
    const safe: Choices = { 4: 6, 8: 'bags', 11: 'safety', 14: 'keep', 17: 'shelter', 21: 'keep', 26: 'clean' };
    expect(simulate(safe, LUCK[2][0]).fail?.kind).toBe('water');
  });
  it('sheltering at once takes less radiation than asking Earth', () => {
    const real = LUCK[2][0];
    const base: Choices = { 4: 3, 8: 'science', 11: 'science', 14: 'off', 21: 'drain', 26: 'burst' };
    const dose = (s: 'shelter' | 'ask') => simulate({ ...base, 17: s }, real).rows[16].dose;
    expect(dose('ask') - dose('shelter')).toBeGreaterThan(10);
  });
  it('lights off can survive, but less often', () => {
    const m = (g: 'keep' | 'off') => {
      const v = ALL.filter((c) => c[14] === g).map(winRate);
      return v.reduce((x, y) => x + y, 0) / v.length;
    };
    expect(m('off')).toBeGreaterThan(0.3);
    expect(m('off')).toBeLessThan(0.55);
    expect(m('keep') - m('off')).toBeGreaterThan(0.2);
  });
  it('following the day-17 meter hint beats always sheltering', () => {
    let follow = 0, shelter = 0, z = 0;
    for (const c of ALL) for (const [l, p] of LUCK) for (const right of [true, false]) {
      const q = p * (right ? 0.8 : 0.2);
      const saysReal = l.falseAlarm ? !right : right;
      if (!simulate({ ...c, 17: saysReal ? 'shelter' : 'ask' }, l).fail) follow += q;
      if (!simulate({ ...c, 17: 'shelter' }, l).fail) shelter += q;
      z += q;
    }
    expect(follow / z).toBeGreaterThan(shelter / z);
  });
  it('a false alarm in the shelter costs power', () => {
    const c: Choices = { 4: 3, 8: 'science', 11: 'reserve', 14: 'keep', 21: 'keep', 26: 'burst' };
    const fa = LUCK[0][0];
    const batt = (s: 'shelter' | 'ask') => simulate({ ...c, 17: s }, fa).rows[16].batt;
    expect(batt('ask') - batt('shelter')).toBeGreaterThan(40);
  });
  it('the dust stays thick to the end', () => {
    const last = simulate(ALL[0], LUCK[0][0]).rows.at(-1);
    expect(last?.tau ?? 0).toBeGreaterThan(7);
  });
  it('every other choice changes the win rate', () => {
    for (const sol of [4, 8, 11, 14, 21, 26] as const) {
      const groups = new Map<string, number[]>();
      for (const c of ALL) {
        const k = String(c[sol]);
        groups.set(k, [...(groups.get(k) ?? []), winRate(c)]);
      }
      const means = [...groups.values()].map((v) => v.reduce((a, b) => a + b, 0) / v.length);
      expect(Math.max(...means) - Math.min(...means)).toBeGreaterThan(0.03);
    }
  });
});

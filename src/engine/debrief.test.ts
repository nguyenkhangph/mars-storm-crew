import { describe, expect, it } from 'vitest';
import { debrief, madeCount } from './debrief';
import type { Choices, Luck } from './types';

const real: Luck = { falseAlarm: false, secondStorm: true };
const good: Choices = { 4: 3, 8: 'ice', 11: 'reserve', 14: 'keep', 17: 'shelter', 21: 'keep', 26: 'burst' };
const poor: Choices = { 4: 0, 8: 'science', 11: 'science', 14: 'off', 17: 'ask', 21: 'drain', 26: 'clean' };

describe('mission report', () => {
  it('is deterministic and in range', () => {
    const a = debrief(good, real);
    expect(debrief(good, real)).toEqual(a);
    for (const v of Object.values(a.stars)) expect([1, 2, 3]).toContain(v);
    expect(a.wiseCount).toBeGreaterThanOrEqual(0);
    expect(a.wiseCount).toBeLessThanOrEqual(madeCount(good, real));
  });
  it('a careful run scores better than a careless one', () => {
    const g = debrief(good, real), p = debrief(poor, real);
    const sum = (d: typeof g) => Object.values(d.stars).reduce((x, y) => x + y, 0);
    expect(sum(g)).toBeGreaterThan(sum(p));
    expect(p.rethink).not.toBeNull();
  });
});

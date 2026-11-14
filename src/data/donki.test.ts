import { describe, expect, it } from 'vitest';
import { summarize } from './donki';

describe('DONKI summary', () => {
  it('counts strong flares and each Mars-bound CME once', () => {
    const flr = [{ classType: 'M1.2' }, { classType: 'C3.0' }, { classType: 'X8.2' }];
    const enlil = [
      { cmeInputs: [{ CMEID: 'A' }], impactList: [{ location: 'Mars' }] },
      { cmeInputs: [{ CMEID: 'A' }], impactList: [{ location: 'Mars' }, { location: 'Earth' }] },
      { cmeInputs: [{ CMEID: 'B' }], impactList: [{ location: 'Earth' }] },
      { cmeInputs: [{ CMEID: 'C' }], impactList: null },
    ];
    expect(summarize([], flr, enlil, '2026-11-14')).toEqual({ sep: 0, flares: 3, strong: 2, mars: 1, date: '2026-11-14' });
  });
  it('survives empty or broken answers', () => {
    expect(summarize('', null, undefined, 'd')).toEqual({ sep: 0, flares: 0, strong: 0, mars: 0, date: 'd' });
  });
});

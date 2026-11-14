// Saves a 30-day DONKI summary (radiation storms, strong flares, Mars-bound
// CMEs) to public/donki-snapshot.json, used when the live API can't be reached.
// Run before a build/demo: npm run snapshot
import { writeFileSync } from 'node:fs';

const end = new Date();
const d = (x) => x.toISOString().slice(0, 10);
const q = `startDate=${d(new Date(end.getTime() - 30 * 864e5))}&endDate=${d(end)}`;
const servers = [
  (t) => `https://ccmc.gsfc.nasa.gov/DONKI-API/get/${t}?${q}`,
  (t) => `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/${t}?${q}`,
  (t) => `https://api.nasa.gov/DONKI/${t}?${q}&api_key=DEMO_KEY`,
];
const get = async (u) => {
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${r.status} ${u}`);
  const text = await r.text();
  return text.trim() ? JSON.parse(text) : [];
};
const arr = (x) => (Array.isArray(x) ? x : []);
for (const s of servers) {
  try {
    const [sep, flr, enlil] = await Promise.all(['SEP', 'FLR', 'WSAEnlilSimulations'].map((t) => get(s(t))));
    const mars = new Set();
    arr(enlil).forEach((x, i) => {
      if (!arr(x.impactList).some((h) => /mars/i.test(h.location ?? ''))) return;
      const ids = arr(x.cmeInputs).map((c) => c.CMEID ?? c.associatedCMEID).filter(Boolean);
      (ids.length ? ids : [`sim-${i}`]).forEach((id) => mars.add(id));
    });
    const snap = {
      sep: arr(sep).length,
      flares: arr(flr).length,
      strong: arr(flr).filter((f) => /^[MX]/i.test(f.classType ?? '')).length,
      mars: mars.size,
      date: d(end),
      source: s('').split('?')[0],
    };
    writeFileSync(new URL('../public/donki-snapshot.json', import.meta.url), JSON.stringify(snap, null, 1));
    console.log('DONKI snapshot:', snap);
    process.exit(0);
  } catch (e) {
    console.warn('server failed:', e.message);
  }
}
console.error('Could not reach DONKI; snapshot not updated.');
process.exit(1);

// Saves a 30-day DONKI summary (radiation storms, strong flares, Mars-bound
// CMEs) to public/donki-snapshot.json, used when the live API can't be reached.
// Run before a build/demo: npm run snapshot
import { writeFileSync } from 'node:fs';

const end = new Date();
const d = (x) => x.toISOString().slice(0, 10);
const q = `startDate=${d(new Date(end.getTime() - 30 * 864e5))}&endDate=${d(end)}`;
const servers = [
  (t) => `https://ccmc.gsfc.nasa.gov/DONKI-API/get/${t}?${q}`,
  (t) => `https://api.nasa.gov/DONKI/${t}?${q}&api_key=DEMO_KEY`,
];
const get = async (u) => {
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${r.status} ${u}`);
  const text = await r.text();
  return text.trim() ? JSON.parse(text) : [];
};
// each data type tries every server in turn, so one broken endpoint does not sink the others
const getType = async (t) => {
  for (const s of servers) {
    try {
      return { data: await get(s(t)), from: s('').split('?')[0].replace(/\/$/, '') };
    } catch (e) {
      console.warn('server failed:', e.message);
    }
  }
  throw new Error(`no server answered for ${t}`);
};
const arr = (x) => (Array.isArray(x) ? x : []);
try {
  const [sep, flr, enlil] = await Promise.all(['SEP', 'FLR', 'WSAEnlilSimulations'].map(getType));
  const mars = new Set();
  arr(enlil.data).forEach((x, i) => {
    if (!arr(x.impactList).some((h) => /mars/i.test(h.location ?? ''))) return;
    const ids = arr(x.cmeInputs).map((c) => c.CMEID ?? c.associatedCMEID).filter(Boolean);
    (ids.length ? ids : [`sim-${i}`]).forEach((id) => mars.add(id));
  });
  const snap = {
    sep: arr(sep.data).length,
    flares: arr(flr.data).length,
    strong: arr(flr.data).filter((f) => /^[MX]/i.test(f.classType ?? '')).length,
    mars: mars.size,
    date: d(end),
    source: [...new Set([sep.from, flr.from, enlil.from])].join(', '),
  };
  writeFileSync(new URL('../public/donki-snapshot.json', import.meta.url), JSON.stringify(snap, null, 1));
  console.log('DONKI snapshot:', snap);
} catch (e) {
  console.error('Could not reach DONKI; snapshot not updated.', e.message);
  process.exit(1);
}

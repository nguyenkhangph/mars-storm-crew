// Saves the last 30 days of DONKI solar energetic particle events to
// public/donki-snapshot.json, used when the live API can't be reached.
// Run before a build/demo: npm run snapshot
import { writeFileSync } from 'node:fs';

const end = new Date();
const d = (x) => x.toISOString().slice(0, 10);
const q = `startDate=${d(new Date(end.getTime() - 30 * 864e5))}&endDate=${d(end)}`;
const urls = [
  `https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?${q}`,
  `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP?${q}`,
  `https://api.nasa.gov/DONKI/SEP?${q}&api_key=DEMO_KEY`,
];
for (const u of urls) {
  try {
    const r = await fetch(u);
    if (!r.ok) continue;
    const text = await r.text();
    const j = text.trim() ? JSON.parse(text) : [];
    const snap = { n: Array.isArray(j) ? j.length : 0, date: d(end), source: u.split('?')[0] };
    writeFileSync(new URL('../public/donki-snapshot.json', import.meta.url), JSON.stringify(snap, null, 1));
    console.log('DONKI snapshot:', snap);
    process.exit(0);
  } catch {
    /* try the next server */
  }
}
console.error('Could not reach DONKI; snapshot not updated.');
process.exit(1);

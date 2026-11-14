/**
 * What NASA's DONKI space-weather database says about the last 30 days.
 * Pure helpers so the game, the snapshot script and the tests share them.
 */
export type SunSummary = {
  sep: number; // solar energetic particle events (radiation storms)
  flares: number; // all flares
  strong: number; // M- and X-class flares
  mars: number; // CMEs that NASA's WSA-Enlil model predicted would reach Mars
  date: string;
};

type Flare = { classType?: string };
type Enlil = { cmeInputs?: { associatedCMEID?: string }[]; impactList?: { location?: string }[] | null };

export function summarize(sep: unknown, flr: unknown, enlil: unknown, date: string): SunSummary {
  const arr = <T,>(x: unknown) => (Array.isArray(x) ? (x as T[]) : []);
  const flares = arr<Flare>(flr);
  const strong = flares.filter((f) => /^[MX]/i.test(f.classType ?? '')).length;
  // the same CME is often simulated several times: count each CME once
  const toMars = new Set<string>();
  arr<Enlil>(enlil).forEach((s, i) => {
    if (!(s.impactList ?? []).some((h) => /mars/i.test(h.location ?? ''))) return;
    const ids = (s.cmeInputs ?? []).map((c) => c.associatedCMEID).filter(Boolean) as string[];
    (ids.length ? ids : [`sim-${i}`]).forEach((id) => toMars.add(id));
  });
  return { sep: arr(sep).length, flares: flares.length, strong, mars: toMars.size, date };
}

export const donkiQuery = (end: Date) => {
  const d = (x: Date) => x.toISOString().slice(0, 10);
  return { q: `startDate=${d(new Date(end.getTime() - 30 * 864e5))}&endDate=${d(end)}`, date: d(end) };
};

/** Servers to try in order. Each returns the URL for one DONKI type. */
export const DONKI_SERVERS: ((type: string, q: string) => string)[] = [
  (type, q) => `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/${type}?${q}`,
  (type, q) => `https://ccmc.gsfc.nasa.gov/DONKI-API/get/${type}?${q}`,
  (type, q) => `https://api.nasa.gov/DONKI/${type}?${q}&api_key=DEMO_KEY`,
];

/** The September 2017 radiation storm the game's day 17 is based on. */
export const DONKI_SEP_2017 = 'https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/13101/-1';

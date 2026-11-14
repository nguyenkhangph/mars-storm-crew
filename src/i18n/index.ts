import en from './en.json';
import vi from './vi.json';

export type Lang = 'en' | 'vi';
export type Strings = typeof en;
export const STRINGS: Record<Lang, Strings> = { en, vi };

export function formatDelay(sec: number, t: Strings): string {
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m} ${t.ui.min} ${String(s).padStart(2, '0')} ${t.ui.sec}`;
}

export function formatDate(d: Date, lang: Lang): string {
  if (lang === 'vi') return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

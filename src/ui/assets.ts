const BASE = import.meta.env.BASE_URL + 'assets/';

export const PORTRAIT = {
  commander: 'captain-ada',
  power: 'engineer-rosa',
  life: 'mechanic-gus',
  doctor: 'doctor-lin',
  rover: 'pilot-kai',
  scientist: 'officer-noor',
  botanist: 'cadet-mia',
} as const;
export type Role = keyof typeof PORTRAIT;

/** Faces a player can pick for the Commander (all 7 humans, a robot and an alien). */
export const LOOKS = ['captain-ada', 'engineer-rosa', 'pilot-kai', 'officer-noor', 'doctor-lin', 'cadet-mia', 'mechanic-gus', 'robot-b0t', 'alien-zib'] as const;
export type Look = (typeof LOOKS)[number];
let cast: Record<Role, string> = { ...PORTRAIT };

/** The Commander takes the chosen face; whoever wore it takes the default captain face. */
export function setCommanderLook(look: Look) {
  cast = { ...PORTRAIT };
  if (look === PORTRAIT.commander) return;
  const swap = (Object.keys(PORTRAIT) as Role[]).find((r) => PORTRAIT[r] === look);
  if (swap) cast[swap] = PORTRAIT.commander;
  cast.commander = look;
}
/** The face a role wears right now (it changes when the Commander takes a crew face). */
export const faceOf = (r: Role) => cast[r];
export const lookUrl = (look: Look, mood: Mood = 'happy') => `${BASE}portraits/${look}-${mood}.png`;
export type Mood = 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry';

export const portrait = (r: Role, mood: Mood = 'neutral') => `${BASE}portraits/${cast[r]}-${mood}.png`;
export const talkStrip = (r: Role) => `${BASE}portraits/${cast[r]}-talk-2f.png`;
export const icon = (name: string) => `${BASE}icons/icon-${name}.png`;
export const sprite = (file: string) => `${BASE}marsbase/${file}`;
export const scene = (k: 'clear' | 'storm') => `${BASE}scenes/${k}.webp`;

/** WebP first; fall back to the PNG an older setup run produced, then hide. */
export const sceneFallback = (e: { currentTarget: HTMLImageElement }) => {
  const img = e.currentTarget;
  if (img.src.endsWith('.webp')) img.src = img.src.replace(/\.webp$/, '.png');
  else img.style.visibility = 'hidden';
};

/** Hide an image whose licensed file is not installed, so the game still runs. */
export const hideMissing = (e: { currentTarget: HTMLImageElement }) => {
  e.currentTarget.style.visibility = 'hidden';
};

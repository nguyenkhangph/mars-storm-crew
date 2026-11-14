import type { Debrief } from '../engine/debrief';
import type { Strings } from '../i18n';
import { icon, lookUrl, type Look } from './assets';

export type CertInput = {
  t: Strings;
  name: string;
  look: Look;
  won: boolean;
  ending: string;
  d: Debrief;
  code: number;
  dateText: string;
};

const W = 1600, H = 1130;
const NAVY = '#151a33', INK = '#1e2340', PAPER = '#f6f1e6', AMBER = '#e8a04c', ROSE = '#c2547e', TEAL = '#2f9c8e', MUTED = '#5c5f73';
const FONT = "'Be Vietnam Pro', system-ui, sans-serif";

function load(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

/** Writes text centred, shrinking it until it fits the width. */
function fit(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, weight = 700, color = INK) {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${FONT}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 12);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** Wraps text into lines no wider than maxW. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) { out.push(line); line = w; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

/** Pixel-style double frame with corner studs. */
function frame(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PAPER;
  ctx.fillRect(40, 40, W - 80, H - 80);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.strokeRect(56, 56, W - 112, H - 112);
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 4;
  ctx.strokeRect(72, 72, W - 144, H - 144);
  for (const [x, y] of [[56, 56], [W - 56, 56], [56, H - 56], [W - 56, H - 56]]) {
    ctx.fillStyle = ROSE;
    ctx.fillRect(x - 14, y - 14, 28, 28);
    ctx.fillStyle = INK;
    ctx.fillRect(x - 6, y - 6, 12, 12);
  }
  // little Mars in the top corner
  const g = ctx.createRadialGradient(1420, 190, 10, 1440, 210, 80);
  g.addColorStop(0, '#f0a46a'); g.addColorStop(0.6, '#c25a2e'); g.addColorStop(1, '#5a1e12');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(1440, 210, 70, 0, Math.PI * 2); ctx.fill();
}

/** Draws the certificate and returns it as a PNG blob. */
export async function makeCertificate(c: CertInput): Promise<Blob> {
  await document.fonts?.ready;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const { t } = c;
  frame(ctx);

  fit(ctx, t.ui.title, W / 2, 170, 1000, 40, 800, ROSE);
  fit(ctx, c.won ? t.cert.titleWin : t.cert.titleBrave, W / 2, 250, 1100, 64, 800, INK);
  fit(ctx, t.cert.awarded, W / 2, 320, 1000, 28, 500, MUTED);

  const face = await load(lookUrl(c.look, 'happy'));
  if (face) {
    ctx.fillStyle = NAVY;
    ctx.fillRect(W / 2 - 96, 350, 192, 192);
    ctx.drawImage(face, W / 2 - 88, 358, 176, 176);
    ctx.strokeStyle = AMBER; ctx.lineWidth = 6; ctx.strokeRect(W / 2 - 96, 350, 192, 192);
  }
  fit(ctx, `${t.cert.commander} ${c.name || ''}`.trim(), W / 2, 620, 1200, 72, 800, INK);
  ctx.fillStyle = AMBER; ctx.fillRect(W / 2 - 300, 640, 600, 6);

  ctx.font = `500 30px ${FONT}`;
  ctx.fillStyle = INK;
  wrap(ctx, c.won ? t.cert.didWin : t.cert.didBrave, 1150).forEach((l, i) => ctx.fillText(l, W / 2, 700 + i * 42));
  fit(ctx, c.ending, W / 2, 800, 1200, 30, 700, TEAL);

  // four star ratings
  const crit = [['safety', 'heart'], ['radiation', 'shield'], ['science', 'flask'], ['wise', 'star']] as const;
  const icons = await Promise.all(crit.map(([, ic]) => load(icon(ic))));
  crit.forEach(([k], i) => {
    const x = 330 + i * 313;
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 135, 830, 270, 120);
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.strokeRect(x - 135, 830, 270, 120);
    const im = icons[i];
    if (im) ctx.drawImage(im, x - 18, 840, 36, 36);
    fit(ctx, t.report.criteria[k].name, x, 902, 250, 22, 700, INK);
    const n = c.d.stars[k];
    ctx.font = `800 40px ${FONT}`;
    for (let s = 0; s < 3; s++) { ctx.fillStyle = s < n ? AMBER : '#cfc9d9'; ctx.fillText('★', x - 44 + s * 44, 942); }
  });

  const [badge] = t.report.badges[c.d.badge];
  ctx.textAlign = 'left';
  fit(ctx, `${t.cert.badge}: ${badge}`, 130, 1000, 600, 26, 700, INK);
  ctx.textAlign = 'right';
  fit(ctx, `${t.cert.code} ${c.code} · ${t.cert.date} ${c.dateText}`, W - 130, 1000, 600, 26, 600, INK);
  ctx.textAlign = 'center';
  fit(ctx, t.cert.footer, W / 2, 1042, 1300, 20, 500, MUTED);

  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('canvas'))), 'image/png'));
}

/** Saves a blob; iPhones without download support get it in a new tab. */
export function saveBlob(b: Blob, file: string) {
  const url = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = url;
  a.download = file;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

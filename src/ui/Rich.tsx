import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Strings } from '../i18n';

const TERM = /\[\[(\w+)\|([^\]]+)\]\]/g;

/** A dotted word; tap it to see what it means. */
export function Term({ k, t, children }: { k: string; t: Strings; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const toggle = () => {
    // open upward when the word sits in the lower half of the screen
    const r = ref.current?.getBoundingClientRect();
    setUp(!!r && r.top > window.innerHeight / 2);
    setOpen(!open);
  };
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setOpen(false), 6000);
    return () => clearTimeout(id);
  }, [open]);
  const tip = (t.glossary as Record<string, string>)[k];
  if (!tip) return <>{children}</>;
  return (
    <span className="term-wrap">
      <span
        role="button"
        tabIndex={0}
        className="term"
        aria-expanded={open}
        ref={ref}
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggle(); } }}
      >{children}</span>
      {open && <span className={`term-tip${up ? ' up' : ''}`} role="tooltip">{tip}</span>}
    </span>
  );
}

/** Renders text with [[key|word]] glossary markup as tappable terms. */
export function Rich({ text, t }: { text: string; t: Strings }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TERM)) {
    out.push(text.slice(last, m.index));
    out.push(<Term key={m.index} k={m[1]} t={t}>{m[2]}</Term>);
    last = (m.index ?? 0) + m[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}

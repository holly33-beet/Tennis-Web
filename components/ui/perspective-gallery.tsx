"use client";
import * as React from "react";

// Perspective gallery: a strip of cards in 3D. The active card sits flat in the middle and is the only one you
// can type into; the others turn away and fade. Click a side card, use the arrows, or the arrow keys to move.
// Ported from Holly's shadcn/Tailwind "perspective-gallery" component to plain CSS (classes in globals.css),
// and changed to hold any card (including calculator inputs) instead of generated colour tiles.

export type GalleryItem = { key: string; label: string; node: React.ReactNode };

export function PerspectiveGallery({
  items,
  label,
  start,
  cardWidth = 280,
  followPointer = false,
  className,
}: {
  items: GalleryItem[];
  label: string;
  start?: number;
  /** Largest card width in px; shrinks to fit narrow screens. */
  cardWidth?: number;
  /** Move the active card with the mouse position (only for cards with nothing to type into). */
  followPointer?: boolean;
  className?: string;
}) {
  const n = items.length;
  const clamp = React.useCallback((i: number) => Math.max(0, Math.min(n - 1, i)), [n]);
  const [active, setActive] = React.useState(() => clamp(start ?? Math.floor(n / 2)));
  const stage = React.useRef<HTMLDivElement>(null);
  const cards = React.useRef<(HTMLDivElement | null)[]>([]);
  const inner = React.useRef<(HTMLDivElement | null)[]>([]);
  const pos = React.useRef(active);
  const target = React.useRef(active);

  React.useEffect(() => { target.current = active; }, [active]);
  React.useEffect(() => { setActive((a) => clamp(a)); }, [clamp]);

  // Only the front card takes clicks and typing.
  React.useEffect(() => {
    inner.current.forEach((el, i) => { if (el) el.toggleAttribute("inert", i !== active); });
  }, [active, n]);

  // Stage height follows the front card, so a tall card elsewhere in the strip doesn't leave a gap.
  React.useEffect(() => {
    const fit = () => {
      const h = inner.current[active]?.offsetHeight ?? 0;
      if (stage.current) stage.current.style.height = h + "px";
    };
    fit();
    const ro = new ResizeObserver(fit);
    inner.current.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [n, active]);

  React.useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = "";
    const loop = () => {
      pos.current += (target.current - pos.current) * (reduce ? 1 : 0.1);
      if (Math.abs(target.current - pos.current) < 0.001) pos.current = target.current; // settle, so the cards stop moving
      const sw = stage.current?.clientWidth ?? 800;
      const w = Math.min(cardWidth, sw * 0.8);
      const key = pos.current + ":" + w;
      if (key === last) { raf = requestAnimationFrame(loop); return; }
      last = key;
      cards.current.forEach((el, i) => {
        if (!el) return;
        const d = i - pos.current;
        const a = Math.min(Math.abs(d), 3);
        el.style.width = w + "px";
        el.style.marginLeft = -w / 2 + "px";
        el.style.transform = `translate3d(${d * w * 0.74}px,0,${-a * 110}px) rotateY(${Math.max(-1, Math.min(1, -d)) * Math.min(a, 1.4) * 38}deg) scale(${1 - a * 0.04})`;
        el.style.opacity = String(1 - Math.min(a / 3.4, 0.85));
        el.style.zIndex = String(100 - Math.round(a * 10));
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [n, cardWidth]);

  return (
    <section
      className={"pg" + (className ? " " + className : "")}
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={(e) => {
        const t = e.target as HTMLElement;
        if (t.tagName === "INPUT" || t.tagName === "SELECT") return; // arrow keys still move the cursor in inputs
        if (e.key === "ArrowRight") { e.preventDefault(); setActive((a) => clamp(a + 1)); }
        if (e.key === "ArrowLeft") { e.preventDefault(); setActive((a) => clamp(a - 1)); }
      }}
    >
      <div
        ref={stage}
        className="pg-stage"
        tabIndex={-1}
        onPointerMove={followPointer ? (e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          setActive(clamp(Math.round(((e.clientX - r.left) / r.width) * (n - 1))));
        } : undefined}
      >
        {items.map((it, i) => (
          <div
            key={it.key}
            ref={(el) => { cards.current[i] = el; }}
            className={"pg-card" + (i === active ? " is-active" : "")}
            aria-current={i === active || undefined}
          >
            <div ref={(el) => { inner.current[i] = el; }} className="pg-inner">{it.node}</div>
            {i !== active && <button type="button" className="pg-pick" aria-label={`Show ${it.label}`} title={it.label} tabIndex={-1} onClick={() => setActive(i)} />}
          </div>
        ))}
      </div>
      <div className="pg-nav">
        <button type="button" aria-label="Previous" onClick={() => setActive((a) => clamp(a - 1))} disabled={active === 0}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
        </button>
        <p aria-live="polite"><span>{items[active]?.label}</span> {active + 1} / {n}</p>
        <button type="button" aria-label="Next" onClick={() => setActive((a) => clamp(a + 1))} disabled={active === n - 1}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
        </button>
      </div>
    </section>
  );
}

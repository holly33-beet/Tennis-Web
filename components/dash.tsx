"use client";
import * as React from "react";
import { fmt } from "@/lib/budget";

// Dashboard pieces for the Budget and Balance sheet pages: tinted stat tiles, a bar chart with
// tracks, and a donut with a legend. Plain SVG/CSS, no chart library.

export type Tone = "green" | "yellow" | "blue" | "cream";

export function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 24}`).join(" ");
  return <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

export function StatTile({ tone, label, value, sub, pill, spark, neg }: { tone: Tone; label: string; value: number; sub?: React.ReactNode; pill?: string; spark?: number[]; neg?: boolean }) {
  return (
    <div className={`tile tone-${tone}`}>
      <div className="tile-top"><span className="tile-label">{label}</span>{pill && <span className="pill">{pill}</span>}</div>
      <div className={`tile-val${neg ? " neg" : ""}`}>{fmt(value)}</div>
      {sub && <div className="tile-sub">{sub}</div>}
      {spark && <Spark values={spark} />}
    </div>
  );
}

const niceStep = (raw: number) => {
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};
const short = (n: number) => (Math.abs(n) >= 1000 ? `$${+(n / 1000).toFixed(1)}K` : `$${Math.round(n)}`);

export function Bars({ data, height = 220 }: { data: { label: string; value: number; note?: string }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const peak = data.reduce((b, d, i) => (d.value > data[b].value ? i : b), 0);
  const [hover, setHover] = React.useState<number | null>(null);
  const show = hover ?? peak;
  return (
    <div className="bars" style={{ height }}>
      <div className="bars-axis">{[...ticks].reverse().map((t) => <span key={t}>{short(t)}</span>)}</div>
      <div className="bars-plot">
        {data.map((d, i) => (
          <div className="bar-col" key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}
            aria-label={`${d.label}: ${fmt(d.value)}`}>
            <div className="bar-track">
              <div className={`bar-fill${i === show ? " on" : ""}`} style={{ height: `${(d.value / top) * 100}%` }}>
                {i === show && d.value > 0 && <span className="bar-tip">{fmt(d.value)}{d.note && <small>{d.note}</small>}</span>}
              </div>
            </div>
            <span className="bar-lab">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Donut({ items, centerLabel, centerValue }: { items: { label: string; value: number; color: string }[]; centerLabel: string; centerValue: number }) {
  const list = items.filter((i) => i.value > 0);
  const total = list.reduce((a, i) => a + i.value, 0) || 1;
  const R = 52, C = 2 * Math.PI * R, gap = list.length > 1 ? 2.5 : 0;
  let acc = 0;
  return (
    <div className="donut-wrap">
      <div className="donut">
        <svg viewBox="0 0 140 140" role="img" aria-label={`${centerLabel} ${fmt(centerValue)}`}>
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--track)" strokeWidth="22" />
          {list.map((i) => {
            const len = (i.value / total) * C;
            const el = <circle key={i.label} cx="70" cy="70" r={R} fill="none" stroke={i.color} strokeWidth="22"
              strokeDasharray={`${Math.max(0, len - gap)} ${C}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" />;
            acc += len;
            return el;
          })}
        </svg>
        <div className="donut-mid"><span>{centerLabel}</span><b>{fmt(centerValue)}</b></div>
      </div>
      <ul className="legend">
        {list.map((i) => {
          const pct = (i.value / total) * 100;
          return (
            <li key={i.label}>
              <span className="lg-name">{i.label}</span>
              <span className="lg-pct">{pct < 1 ? pct.toFixed(1) : Math.round(pct)}%</span>
              <span className="lg-bar"><i style={{ width: `${pct}%`, background: i.color }} /></span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const PALETTE = ["#0E61AC", "#73AE52", "#E9C65A", "#9DBBD8", "#4F8A36", "#E5483B", "#B8D39A"];

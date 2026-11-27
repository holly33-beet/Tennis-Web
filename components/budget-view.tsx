"use client";
import * as React from "react";
import { PerspectiveGallery } from "@/components/ui/perspective-gallery";
import { SHEET_YEARS, fmt, longDate } from "@/lib/budget";

// Budget page with a year picker. 2025–26 and 2026–27 come from their tabs of the budget sheet (read-only copies).
// Any other year is added here and its figures are typed in on the page.
// Everything the page stores lives in this browser (localStorage); a static site has no shared database.

type Ev = { id: string; name: string; date: string; amount: number; note?: string };
export type Custom = { revenue: number; carryover: number };
// The four calculators. Weekday index 0 = Sunday … 6 = Saturday.
type Calc = {
  rate: number; courts: number[]; hours: number[]; dates: string[];
  balls: { qty: number; price: number; total?: number }; // boxes × price OR a typed total, never both
  admin: { fullFee: number; fullN: number; winterFee: number; winterN: number };
  utc: { fee: number; n: number };
};
const SHEET_YEAR = "2026–27";
export const YEARS_KEY = "wtc-years-v1";
export const DATA_KEY = "wtc-year-data-v1";
const evKey = (y: string) => (y === SHEET_YEAR ? "wtc-events-v1" : `wtc-events-v1:${y}`);
export const SHEETS = Object.keys(SHEET_YEARS);
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const blank = (carryover = 0): Custom => ({ revenue: 0, carryover });
const calcKey = (y: string) => `wtc-calc-v1:${y}`;
// Membership revenue calculator (members × WTC membership price). Shown on its own; not yet part of Total revenue.
type MemRev = { n: number; price: number };
const memKey = (y: string) => `wtc-memrev-v1:${y}`;
const defaultMem = (y: string): MemRev => y === "2026–27" ? { n: 101, price: 295 } : y === "2025–26" ? { n: 75, price: 299 } : { n: 0, price: 0 };
export const CALC_NAMES = ["Balls", "Administrative fee", "UTC memberships"];
const wd = (iso: string) => new Date(iso + "T12:00:00").getDay();
const r2 = (n: number) => Math.round(n * 100) / 100;

// Starting values: worked back from the sheet for sheet years, empty for added years.
export function defaultCalc(y: string): Calc {
  if (y === "2026–27") return {
    rate: 38.42, courts: [6, 0, 0, 3, 3, 0, 0], hours: [2, 0, 0, 2, 2, 0, 0],
    dates: Object.values(SHEET_YEARS[y].sessions).flatMap((o) => o.dates),
    balls: { qty: 0, price: 0 },
    admin: { fullFee: 25, fullN: 101, winterFee: 12.5, winterN: 10 },
    utc: { fee: 112, n: 110 },
  };
  if (y === "2025–26") return {
    rate: 38.5, courts: [6, 0, 0, 0, 0, 0, 3], hours: [2, 0, 0, 0, 0, 0, 1],
    dates: Object.values(SHEET_YEARS[y].sessions).flatMap((o) => o.dates),
    balls: { qty: 144, price: 6.25 },
    admin: { fullFee: 25, fullN: 75, winterFee: 0, winterN: 0 },
    utc: { fee: 112, n: 75 },
  };
  return { rate: 38.42, courts: [0, 0, 0, 0, 0, 0, 0], hours: [0, 0, 0, 0, 0, 0, 0], dates: [], balls: { qty: 0, price: 0 }, admin: { fullFee: 25, fullN: 0, winterFee: 12.5, winterN: 0 }, utc: { fee: 112, n: 0 } };
}

export function calcTotals(y: string, k: Calc) {
  const sh = SHEET_YEARS[y];
  const perDay = WEEKDAYS.map((_, i) => {
    const n = k.dates.filter((d) => wd(d) === i).length;
    const each = r2(k.courts[i] * k.hours[i] * k.rate);
    return { n, each, total: r2(n * each) };
  });
  const extras = sh?.courtExtras ?? [];
  const court = r2(perDay.reduce((a, d) => a + d.total, 0) + extras.reduce((a, e) => a + e.amount, 0));
  const ballsTotal = k.balls.total ?? 0;
  const ballsBoxes = k.balls.qty > 0 || k.balls.price > 0; // either box field filled locks the total field
  const ballsEntered = ballsTotal > 0 || (k.balls.qty > 0 && k.balls.price > 0);
  const sheetBalls = sh?.expenses.find((e) => e.name === "Balls")?.amount ?? 0;
  const balls = ballsTotal > 0 ? r2(ballsTotal) : ballsEntered ? r2(k.balls.qty * k.balls.price) : sheetBalls;
  const admin = r2(k.admin.fullFee * k.admin.fullN + k.admin.winterFee * k.admin.winterN);
  const utc = r2(k.utc.fee * k.utc.n);
  return { perDay, extras, court, balls, ballsEntered, ballsTotal, ballsBoxes, admin, utc };
}

export function read<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
export function useStored<T>(key: string, init: T) {
  const [v, setV] = React.useState<T>(init);
  const loaded = React.useRef<string | null>(null);
  React.useEffect(() => { setV(read(key, init)); loaded.current = key; }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (loaded.current !== key) return;
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key, v]);
  return [v, setV] as const;
}

// The school year we're in now: Aug–Dec belongs to that year, Jan–Jul to the year before.
export function currentYear(now = new Date()) {
  const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}–${String((y + 1) % 100).padStart(2, "0")}`;
}
export const yearStart = (y: string) => parseInt(y, 10) || 0;
export const sortYears = (ys: string[]) => [...new Set(ys)].sort((a, b) => yearStart(a) - yearStart(b));
// "2027-28", "27-28", "2027" → "2027–28"
function normYear(s: string): string | null {
  const m = s.trim().match(/^(\d{2}|\d{4})(?:\s*[-–\/]\s*(\d{2}|\d{4}))?$/);
  if (!m) return null;
  const a = m[1].length === 2 ? 2000 + +m[1] : +m[1];
  if (a < 2000 || a > 2099) return null;
  return `${a}–${String((a + 1) % 100).padStart(2, "0")}`;
}

// Numbers for one year, used for the stat cards and for the next year's carryover.
export function totals(y: string, custom: Record<string, Custom>, eventsOverride?: { start: number; events: Ev[] }, calcOverride?: Calc) {
  const sh = SHEET_YEARS[y];
  const hasEvents = !sh || sh.eventBudgetStart !== null;
  const ev = eventsOverride ?? read(evKey(y), { start: sh?.eventBudgetStart ?? 0, events: (sh?.seedEvents ?? []) as Ev[] });
  const spent = hasEvents ? ev.events.reduce((a, e) => a + e.amount, 0) : 0;
  const eventCost = hasEvents ? Math.max(ev.start, spent) : 0;
  const k = calcTotals(y, calcOverride ?? read(calcKey(y), defaultCalc(y)));
  const others = sh ? sh.expenses.filter((e) => !CALC_NAMES.includes(e.name)).reduce((a, e) => a + e.amount, 0) : 0;
  const cost = r2(k.court + k.balls + k.admin + k.utc + others + eventCost);
  const revenue = sh ? sh.revenue : (custom[y] ?? blank()).revenue;
  const carryover = sh ? sh.carryover : (custom[y] ?? blank()).carryover;
  return { cost, revenue, carryover, surplus: r2(revenue - cost), spent, eventCost, k };
}

export function BudgetView() {
  const [years, setYears] = useStored<string[]>(YEARS_KEY, [SHEET_YEAR]);
  const [sel, setSel] = React.useState<string>(currentYear());
  const [custom, setCustom] = useStored<Record<string, Custom>>(DATA_KEY, {});
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [err, setErr] = React.useState("");
  const list = sortYears([...SHEETS, ...years]);
  const year = list.includes(sel) ? sel : list[list.length - 1];

  const openAdd = () => {
    const last = list[list.length - 1];
    setDraft(normYear(String(yearStart(last) + 1)) ?? ""); setErr(""); setAdding(true);
  };
  const add = () => {
    const y = normYear(draft);
    if (!y) return setErr("Type a year like 2027-28.");
    if (list.includes(y)) { setSel(y); setAdding(false); return; }
    const prev = sortYears([...list, y]).filter((x) => yearStart(x) < yearStart(y)).pop();
    const t = prev ? totals(prev, custom) : null;
    const carry = t ? Math.round((t.carryover + t.surplus) * 100) / 100 : 0;
    setCustom((c) => ({ ...c, [y]: blank(carry) }));
    setYears((ys) => sortYears([...ys, y]));
    setSel(y); setAdding(false);
  };
  const removeYear = () => {
    if (SHEET_YEARS[year]) return;
    setYears((ys) => ys.filter((x) => x !== year));
    setCustom((c) => { const n = { ...c }; delete n[year]; return n; });
    try { localStorage.removeItem(evKey(year)); localStorage.removeItem(calcKey(year)); } catch {}
    setSel(SHEET_YEAR);
  };

  return (
    <>
      <h1 className="bud-title">Budget<br />
        <span className="yearpick">
          <select value={year} onChange={(e) => setSel(e.target.value)} aria-label="Budget year">
            {list.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="caret" aria-hidden>▾</span>
        </span>
      </h1>
      <div className="yearbar">
        {adding ? (
          <>
            <input className="inp" value={draft} onChange={(e) => { setDraft(e.target.value); setErr(""); }} onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") setAdding(false); }} placeholder="2027-28" aria-label="New year" autoFocus style={{ width: 120 }} />
            <button className="btn sm" onClick={add}>Add year</button>
            <button className="linkbtn" style={{ marginTop: 0 }} onClick={() => setAdding(false)}>Cancel</button>
            {err && <span className="small err">{err}</span>}
          </>
        ) : (
          <>
            <button className="btn sm ghost" onClick={openAdd}>+ New year</button>
            {!SHEET_YEARS[year] && <button className="linkbtn" style={{ marginTop: 0 }} onClick={removeYear}>Delete {year}</button>}
          </>
        )}
      </div>
      <YearBody key={year} year={year} custom={custom} setCustom={setCustom} />
    </>
  );
}

function Num({ value, onChange, label, step = "1", width = 90, prefix, disabled }: { value: number; onChange: (n: number) => void; label: string; step?: string; width?: number; prefix?: string; disabled?: boolean }) {
  const [txt, setTxt] = React.useState(value ? String(value) : "");
  React.useEffect(() => { if ((parseFloat(txt) || 0) !== value) setTxt(value ? String(value) : ""); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span className="numwrap">{prefix && <i>{prefix}</i>}
      <input className="inp num" type="number" step={step} min="0" placeholder="0" aria-label={label} value={txt} style={{ width }} disabled={disabled}
        onChange={(e) => { setTxt(e.target.value); onChange(Math.max(0, parseFloat(e.target.value) || 0)); }} />
    </span>
  );
}
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="field"><span>{label}</span>{children}</label>
);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
// Season months: September of the first year to April of the next.
const seasonMonths = (y0: number) => Array.from({ length: 8 }, (_, i) => ({ y: i < 4 ? y0 : y0 + 1, m: (8 + i) % 12 }));
const allWeekday = (y0: number, w: number) => seasonMonths(y0).flatMap(({ y, m }) => {
  const n = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) => iso(y, m, i + 1)).filter((d) => wd(d) === w);
});

// Click a date to add or remove it. With a mouse you can also press and drag across dates to
// select (or clear) several at once.
function Calendar({ y0, dates, courts, setDay, locked }: { y0: number; dates: Set<string>; courts: number[]; setDay: (d: string, on: boolean) => void; locked?: boolean }) {
  const drag = React.useRef<{ on: boolean; seen: Set<string> } | null>(null);
  React.useEffect(() => {
    const end = () => { drag.current = null; };
    window.addEventListener("pointerup", end); window.addEventListener("pointercancel", end);
    return () => { window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", end); };
  }, []);
  const down = (e: React.PointerEvent, d: string) => {
    if (locked) return;
    const on = !dates.has(d);
    setDay(d, on);
    if (e.pointerType !== "touch") { drag.current = { on, seen: new Set([d]) }; e.preventDefault(); }
  };
  const enter = (d: string) => {
    const g = drag.current;
    if (locked || !g || g.seen.has(d)) return;
    g.seen.add(d); setDay(d, g.on);
  };
  return (
    <div className={`cal${locked ? " locked" : ""}`} title={locked ? "Dates are locked" : undefined}>
      {seasonMonths(y0).map(({ y, m }) => {
        const first = new Date(y, m, 1).getDay();
        const n = new Date(y, m + 1, 0).getDate();
        return (
          <div className="cal-m" key={`${y}-${m}`}>
            <div className="cal-h">{MONTHS[m]} {y}</div>
            <div className="cal-g">
              {"SMTWTFS".split("").map((d, i) => <span className="cal-w" key={i}>{d}</span>)}
              {Array.from({ length: first }, (_, i) => <span key={"b" + i} />)}
              {Array.from({ length: n }, (_, i) => {
                const d = iso(y, m, i + 1);
                const on = dates.has(d);
                const w = wd(d);
                return <button type="button" key={d} className={`cal-d${on ? " on" : ""}${on && !courts[w] ? " warn" : ""}`}
                  onPointerDown={(e) => down(e, d)} onPointerEnter={() => enter(d)}
                  onKeyDown={(e) => { if (locked) return; if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDay(d, !on); } }}
                  aria-disabled={locked || undefined}
                  aria-pressed={on} aria-label={`${longDate(d)}${on ? ", session" : ""}`}>{i + 1}</button>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function YearBody({ year, custom, setCustom }: { year: string; custom: Record<string, Custom>; setCustom: React.Dispatch<React.SetStateAction<Record<string, Custom>>> }) {
  const sh = SHEET_YEARS[year];
  const isSheet = !!sh;
  const hasEvents = !sh || sh.eventBudgetStart !== null;
  const [store, setStore] = useStored<{ start: number; events: Ev[] }>(evKey(year), { start: sh?.eventBudgetStart ?? 0, events: sh?.seedEvents ?? [] });
  // Add the sheet's seeded events (e.g. AGM food) once, also for browsers that already saved events.
  React.useEffect(() => {
    const seeds = sh?.seedEvents; const key = `wtc-seeded-v2:${year}`;
    if (!seeds?.length) return;
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(key) || "[]");
      if (localStorage.getItem(`wtc-seeded-v1:${year}`)) seen = [...new Set([...seen, "agm-food"])]; // added by the earlier version
      localStorage.setItem(key, JSON.stringify(seeds.map((x) => x.id)));
    } catch { return; }
    const fresh = seeds.filter((x) => !seen.includes(x.id)); // each sheet item is added once; deleting it keeps it deleted
    const retired = sh?.retiredSeeds ?? [];
    if (retired.length) setStore((s) => (s.events.some((e) => retired.includes(e.id)) ? { ...s, events: s.events.filter((e) => !retired.includes(e.id)) } : s));
    if (fresh.length) setStore((s) => ({ ...s, events: [...s.events, ...fresh.filter((x) => !s.events.some((e) => e.id === x.id))] }));
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps
  const [calc, setCalc] = useStored<Calc>(calcKey(year), defaultCalc(year));
  const [mem, setMem] = useStored<MemRev>(memKey(year), defaultMem(year));
  const memRev = r2(mem.n * mem.price);
  const [courtOpen, setCourtOpen] = React.useState(false);
  // Lock on the session dates so a stray click on the calendar can't change them. Unlocking takes two clicks.
  const [locked, setLocked] = useStored<boolean>(`wtc-courtlock-v1:${year}`, false);
  const [unlockAsk, setUnlockAsk] = React.useState(false);
  React.useEffect(() => { if (!unlockAsk) return; const t = setTimeout(() => setUnlockAsk(false), 4000); return () => clearTimeout(t); }, [unlockAsk]);
  const [name, setName] = React.useState("");
  const [date, setDate] = React.useState("");
  const [amount, setAmount] = React.useState("");

  const c = custom[year] ?? blank();
  const setC = (patch: Partial<Custom>) => setCustom((all) => ({ ...all, [year]: { ...(all[year] ?? blank()), ...patch } }));
  const t = totals(year, custom, store, calc);
  const k = t.k;
  const remaining = store.start - t.spent;
  const ending = t.carryover + t.surplus;
  const pct = store.start > 0 ? Math.min(100, (t.spent / store.start) * 100) : t.spent > 0 ? 100 : 0;
  const y0 = yearStart(year);
  const dateSet = new Set(calc.dates);
  const upd = (patch: Partial<Calc>) => setCalc((x) => ({ ...x, ...patch }));
  const setArr = (field: "courts" | "hours", i: number, n: number) => setCalc((x) => { const a = [...x[field]]; a[i] = n; return { ...x, [field]: a }; });
  const setDay = (d: string, on: boolean) => setCalc((x) => {
    const has = x.dates.includes(d);
    if (on === has) return x;
    const next = { ...x, dates: on ? [...x.dates, d].sort() : x.dates.filter((z) => z !== d) };
    // A date on a day with no courts set yet gets a starting setup (3 courts × 2 hours) so it counts right away.
    const w = wd(d);
    if (on && !x.courts[w]) {
      const courts = [...x.courts], hours = [...x.hours];
      courts[w] = 3; hours[w] = hours[w] || 2;
      return { ...next, courts, hours };
    }
    return next;
  });
  const everyWeek = (w: number) => setCalc((x) => ({ ...x, dates: [...new Set([...x.dates, ...allWeekday(y0, w)])].sort() }));
  const clearDay = (w: number) => setCalc((x) => ({ ...x, dates: x.dates.filter((d) => wd(d) !== w) }));
  const weekHours = calc.courts.reduce((a, n, i) => a + n * calc.hours[i], 0);
  const shownDays = WEEKDAYS.map((n, i) => ({ n, i })).filter(({ i }) => calc.courts[i] > 0 || calc.hours[i] > 0 || k.perDay[i].n > 0);
  const [extraDay, setExtraDay] = React.useState<number[]>([]);
  const rows = [...new Set([...shownDays.map((d) => d.i), ...extraDay])].sort();
  const hidden = WEEKDAYS.map((n, i) => ({ n, i })).filter(({ i }) => !rows.includes(i));
  const sheetAdmin = sh?.expenses.find((e) => e.name === "Administrative fee")?.amount;
  const sheetUtc = sh?.expenses.find((e) => e.name === "UTC memberships")?.amount;
  const resetCalc = () => { try { localStorage.removeItem(calcKey(year)); localStorage.removeItem(memKey(year)); } catch {} setCalc(defaultCalc(year)); setMem(defaultMem(year)); setExtraDay([]); };

  const addEvent = () => {
    const amt = parseFloat(amount);
    if (!name.trim() || !(amt > 0)) return;
    setStore((s) => ({ ...s, events: [...s.events, { id: String(Date.now()), name: name.trim(), date, amount: Math.round(amt * 100) / 100 }] }));
    setName(""); setDate(""); setAmount("");
  };
  const remove = (id: string) => setStore((s) => ({ ...s, events: s.events.filter((x) => x.id !== id) }));

  const Line = ({ label, note, amount, flag, edit }: { label: string; note?: string; amount: number; flag?: string; edit?: (n: number) => void }) => (
    <tr><td>{label}{note && <div className="small">{note}</div>}{flag && <span className="flag">{flag}</span>}</td>
      <td className="n">{edit ? <Num value={amount} onChange={(n) => edit(r2(n))} label={label} step="0.01" width={120} /> : fmt(amount)}</td></tr>
  );
  const eventNote = t.spent > store.start ? `Over budget: ${fmt(t.spent)} spent` : `${fmt(t.spent)} spent, ${fmt(remaining)} left`;
  const others = sh ? sh.expenses.filter((e) => !CALC_NAMES.includes(e.name)) : [];

  return (
    <>
      <PerspectiveGallery label="Budget totals" className="pg-stats" cardWidth={300} start={1} followPointer items={[
          { key: "s0", label: "Total cost", node: <div className="card tone-cream"><span className="label">Total cost</span><div className="stat">{fmt(t.cost)}</div></div> },
          { key: "s1", label: "Total revenue", node: <div className="card tone-green"><span className="label">Total revenue</span><div className="stat">{fmt(t.revenue)}</div></div> },
          { key: "s2", label: "Carryover", node: <div className="card tone-yellow"><span className="label">Carryover</span><div className="stat">{fmt(t.carryover)}</div></div> },
          { key: "s3", label: "Surplus or deficit", node: <div className="card tone-lav"><span className="label">Surplus or deficit</span><div className={`stat ${t.surplus < 0 ? "neg" : ""}`}>{fmt(t.surplus)}</div><p className="small">Carryover to next year: {fmt(ending)}</p></div> },
      ]} />

      {/* Membership revenue and the cost calculators; the court calendar opens below */}
      <PerspectiveGallery label="Budget calculators" className="pg-calc" cardWidth={300} start={1} items={[
          { key: "c0", label: "Membership revenue", node: (
            <div className="card mini">
              <span className="label">Membership revenue</span>
              <div className="stat">{fmt(memRev)}</div>
              <p className="small">{mem.n} × {fmt(mem.price)} · not counted in Total revenue yet</p>
              <div className="fields">
                <Field label="Member number"><Num value={mem.n} onChange={(n) => setMem((m) => ({ ...m, n: Math.round(n) }))} label="Member number" /></Field>
                <Field label="WTC membership price"><Num value={mem.price} onChange={(n) => setMem((m) => ({ ...m, price: n }))} label="WTC membership price" step="0.01" prefix="$" /></Field>
              </div>
            </div>
          ) },
          { key: "c1", label: "Court fees", node: (
            <div className="card mini">
              <span className="label">Court fees</span>
              <div className="stat">{fmt(k.court)}</div>
              <p className="small">{calc.dates.length} sessions · {weekHours} court-hours a week{k.extras.length > 0 && ` · plus ${fmt(k.extras.reduce((a, e) => a + e.amount, 0))} extra bookings`}</p>
              <div className="fields">
                <Field label="Price per court-hour"><Num value={calc.rate} onChange={(n) => upd({ rate: n })} label="Price per court-hour" step="0.01" prefix="$" /></Field>
              </div>
              <button className="linkbtn" onClick={() => setCourtOpen((o) => !o)} aria-expanded={courtOpen}>{courtOpen ? "Hide sessions ▴" : "Edit days and sessions ▾"}</button>
            </div>
          ) },
          { key: "c2", label: "Balls", node: (
            <div className="card mini">
              <span className="label">Balls</span>
              <div className="stat">{fmt(k.balls)}</div>
              <p className="small">{k.ballsTotal > 0 ? "Typed total" : k.ballsEntered ? `${calc.balls.qty} boxes × ${fmt(calc.balls.price)}` : sh ? "Sheet amount. Enter boxes × price, or type a total." : "Enter boxes × price, or type a total."}</p>
              <div className="fields">
                <Field label="Boxes bought"><Num disabled={k.ballsTotal > 0} value={calc.balls.qty} onChange={(n) => upd({ balls: { ...calc.balls, qty: Math.round(n) } })} label="Boxes bought" /></Field>
                <Field label="Price per box"><Num disabled={k.ballsTotal > 0} value={calc.balls.price} onChange={(n) => upd({ balls: { ...calc.balls, price: n } })} label="Price per box" step="0.01" prefix="$" /></Field>
                <Field label="Or total amount"><Num disabled={k.ballsBoxes} value={calc.balls.total ?? 0} onChange={(n) => upd({ balls: { ...calc.balls, total: n } })} label="Balls total amount" step="0.01" prefix="$" /></Field>
              </div>
              {(k.ballsTotal > 0 || k.ballsBoxes) && <p className="small">{k.ballsTotal > 0 ? "Using the total. Clear it to use boxes × price." : "Using boxes × price. Clear both to type a total."}</p>}
            </div>
          ) },
          { key: "c3", label: "Administrative fee", node: (
            <div className="card mini">
              <span className="label">Administrative fee</span>
              <div className="stat">{fmt(k.admin)}</div>
              <p className="small">{calc.admin.fullN} × {fmt(calc.admin.fullFee)} + {calc.admin.winterN} × {fmt(calc.admin.winterFee)}</p>
              <div className="fields">
                <Field label="Full-year fee"><Num value={calc.admin.fullFee} onChange={(n) => upd({ admin: { ...calc.admin, fullFee: n } })} label="Full-year fee per member" step="0.01" prefix="$" /></Field>
                <Field label="Full-year members"><Num value={calc.admin.fullN} onChange={(n) => upd({ admin: { ...calc.admin, fullN: Math.round(n) } })} label="Full-year members" /></Field>
                <Field label="Winter fee"><Num value={calc.admin.winterFee} onChange={(n) => upd({ admin: { ...calc.admin, winterFee: n } })} label="Winter fee per member" step="0.01" prefix="$" /></Field>
                <Field label="Winter members"><Num value={calc.admin.winterN} onChange={(n) => upd({ admin: { ...calc.admin, winterN: Math.round(n) } })} label="Winter members" /></Field>
              </div>
              {sheetAdmin !== undefined && Math.abs(sheetAdmin - k.admin) > 0.005 && <p className="small err-t">The sheet shows {fmt(sheetAdmin)}.</p>}
            </div>
          ) },
          { key: "c4", label: "UTC membership", node: (
            <div className="card mini">
              <span className="label">UTC membership</span>
              <div className="stat">{fmt(k.utc)}</div>
              <p className="small">{calc.utc.n} × {fmt(calc.utc.fee)}</p>
              <div className="fields">
                <Field label="Price per person"><Num value={calc.utc.fee} onChange={(n) => upd({ utc: { ...calc.utc, fee: n } })} label="UTC price per person" step="0.01" prefix="$" /></Field>
                <Field label="Members"><Num value={calc.utc.n} onChange={(n) => upd({ utc: { ...calc.utc, n: Math.round(n) } })} label="UTC members" /></Field>
              </div>
              {sheetUtc !== undefined && Math.abs(sheetUtc - k.utc) > 0.005 && <p className="small err-t">The sheet shows {fmt(sheetUtc)}.</p>}
            </div>
          ) },
          ...(hasEvents ? [{ key: "c5", label: "Event budget", node: (
            <div className="card mini evcard">
              <span className="label">Event budget</span>
              <div className={`stat ${remaining < 0 ? "neg" : ""}`}>{fmt(remaining)}</div>
              <p className="small">left of {fmt(store.start)}</p>
              <div className="bar"><i style={{ width: `${pct}%`, background: remaining < 0 ? "var(--red)" : undefined }} /></div>
              <label className="small" style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 14px" }}>
                Starting budget $
                <input className="inp" type="number" min="0" step="1" value={store.start} onChange={(e) => setStore((s) => ({ ...s, start: Math.max(0, parseFloat(e.target.value) || 0) }))} style={{ width: 110 }} />
              </label>
              <div className="evform" onKeyDown={(e) => { if (e.key === "Enter") addEvent(); }}>
                <input className="inp" placeholder="Event name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Event name" />
                <input className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Event date" />
                <input className="inp" type="number" min="0" step="0.01" placeholder="Cost $" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Event cost" />
                <button className="btn" type="button" onClick={addEvent}>Add event</button>
              </div>
              {store.events.length === 0 ? <p className="small" style={{ marginTop: 12 }}>No events yet. Each event you add comes off the event budget.</p> : (
                <table style={{ marginTop: 12 }}><tbody>
                  {store.events.map((e) => (
                    <tr key={e.id}><td>{e.name}{e.date && <div className="small">{longDate(e.date)}</div>}{e.note && <div className="small">{e.note}</div>}</td><td className="n">−{fmt(e.amount)}</td>
                      <td className="n" style={{ width: 28 }}><button className="x" onClick={() => remove(e.id)} aria-label={`Remove ${e.name}`}>×</button></td></tr>
                  ))}
                </tbody></table>
              )}
              <p className="small" style={{ marginTop: 10 }}>Saved in this browser only.</p>
            </div>
          ) }] : []),
      ]} />
      {courtOpen && (
        <div className="grid">
          <div className="card c12">
          <div className="courtcalc">
            <div>
              <div className="scroll"><table className="daytbl"><tbody>
                <tr><th>Day</th><th className="n">Courts</th><th className="n">Hours</th><th className="n">Sessions</th><th className="n">Cost</th></tr>
                {rows.map((i) => (
                  <tr key={i}>
                    <td>{WEEKDAYS[i]}s<div className="small">{fmt(k.perDay[i].each)} a session</div>
                      {!locked && <div className="dayacts"><button className="linkbtn" onClick={() => everyWeek(i)}>Every week</button><button className="linkbtn" onClick={() => clearDay(i)}>Clear</button></div>}</td>
                    <td className="n"><Num value={calc.courts[i]} onChange={(n) => setArr("courts", i, Math.round(n))} label={`${WEEKDAYS[i]} courts`} width={58} /></td>
                    <td className="n"><Num value={calc.hours[i]} onChange={(n) => setArr("hours", i, n)} label={`${WEEKDAYS[i]} hours per session`} step="0.5" width={58} /></td>
                    <td className="n">{k.perDay[i].n}</td>
                    <td className="n">{fmt(k.perDay[i].total)}</td>
                  </tr>
                ))}
                {k.extras.map((e) => <tr key={e.name}><td colSpan={4}>{e.name}{e.note && <div className="small">{e.note}</div>}</td><td className="n">{fmt(e.amount)}</td></tr>)}
                <tr className="total"><td>Total</td><td /><td /><td className="n">{calc.dates.length}</td><td className="n">{fmt(k.court)}</td></tr>
              </tbody></table></div>
              <div className="datelock">
                {locked ? (
                  <>
                    <span className="lockstate">🔒 Dates locked</span>
                    <button type="button" className="linkbtn" onClick={() => { if (unlockAsk) { setLocked(false); setUnlockAsk(false); } else setUnlockAsk(true); }}>{unlockAsk ? "Click again to unlock" : "Unlock"}</button>
                  </>
                ) : (
                  <button type="button" className="btn sm" onClick={() => setLocked(true)}>🔒 Lock dates</button>
                )}
              </div>
              {!locked && hidden.length > 0 && (
                <div className="addday">
                  <select className="inp" value="" onChange={(e) => { const i = +e.target.value; setExtraDay((x) => [...x, i]); }} aria-label="Add a day">
                    <option value="" disabled>+ Add a day</option>
                    {hidden.map(({ n, i }) => <option key={i} value={i}>{n}</option>)}
                  </select>
                </div>
              )}
              {locked ? <p className="small" style={{ marginTop: 10 }}>The calendar is locked, so clicks on it do nothing. Unlock to change the dates.</p> : <p className="small" style={{ marginTop: 10 }}>Click dates to add them (blue) or click again to remove. You can also drag across several dates at once. “Every week” fills in that day for the whole season (Sep to Apr); then click off holidays and reading weeks. Lock the dates when you are done.</p>}
              {calc.dates.some((d) => !calc.courts[wd(d)]) && <p className="small err-t">Red dates have no courts set for that day, so they cost $0.</p>}
            </div>
            <Calendar y0={y0} dates={dateSet} courts={calc.courts} setDay={setDay} locked={locked} />
          </div>
          </div>
        </div>
      )}
      <div className="calcfoot"><span className="small">Calculator inputs save in this browser.</span> <button className="linkbtn" style={{ marginTop: 0 }} onClick={resetCalc}>{sh ? "Reset to sheet numbers" : "Clear calculators"}</button></div>

      <div className="grid">
        <div className="card c12">
          <h2>Budget breakdown</h2>
          {sh && <p className="small" style={{ margin: "-4px 0 8px" }}>From the “{sh.source}” sheet, with the calculators above.</p>}
          <div className="scroll"><table><tbody>
            <tr><th>Part</th><th className="n">Amount</th></tr>
            {k.perDay.map((d, i) => d.n > 0 && <Line key={i} label={`Court fees: ${WEEKDAYS[i]}s`} note={`${d.n} sessions × ${fmt(d.each)}`} amount={d.total} />)}
            {k.extras.map((e) => <Line key={e.name} label={`Court fees: ${e.name}`} note={e.note} amount={e.amount} />)}
            <Line label="Balls" amount={k.balls} />
            <Line label="Administrative fee" amount={k.admin} />
            <Line label="UTC memberships" amount={k.utc} />
            {others.map((e) => <Line key={e.name} label={e.name} note={e.note || undefined} amount={e.amount} flag={e.flag} />)}
            {hasEvents && <Line label="Event budget" note={eventNote} amount={t.eventCost} />}
            <tr className="total"><td>Total cost</td><td className="n">{fmt(t.cost)}</td></tr>
            {sh ? (
              <>
                <tr><td>Total revenue<div className="small">{sh.revenueNote}</div></td><td className="n">{fmt(sh.revenue)}</td></tr>
                <tr><td>Carryover from last year{sh.carryoverFlag && <span className="flag">{sh.carryoverFlag}</span>}</td><td className="n">{fmt(sh.carryover)}</td></tr>
              </>
            ) : (
              <>
                <Line label="Total revenue" note="Membership fees and anything else coming in" amount={c.revenue} edit={(n) => setC({ revenue: n })} />
                <Line label="Carryover from last year" note="Filled from last year’s ending figure when the year was added" amount={c.carryover} edit={(n) => setC({ carryover: n })} />
              </>
            )}
          </tbody></table></div>
        </div>

      </div>
    </>
  );
}

// Everything one year adds up to, as line items. Used by the Balance sheet page.
export function yearReport(y: string, custom: Record<string, Custom>) {
  const sh = SHEET_YEARS[y];
  const t = totals(y, custom);
  const k = t.k;
  const hasEvents = !sh || sh.eventBudgetStart !== null;
  const lines: { label: string; amount: number }[] = [
    ...k.perDay.flatMap((d, i) => (d.n > 0 ? [{ label: `Court fees: ${WEEKDAYS[i]}s`, amount: d.total }] : [])),
    ...k.extras.map((e) => ({ label: `Court fees: ${e.name}`, amount: e.amount })),
    { label: "Balls", amount: k.balls },
    { label: "Administrative fee", amount: k.admin },
    { label: "UTC memberships", amount: k.utc },
    ...(sh ? sh.expenses.filter((e) => !CALC_NAMES.includes(e.name)).map((e) => ({ label: e.name, amount: e.amount })) : []),
    ...(hasEvents ? [{ label: "Event budget", amount: t.eventCost }] : []),
  ].filter((l) => l.amount !== 0 || !sh);
  return { year: y, sheet: sh?.source ?? null, revenueNote: sh?.revenueNote ?? "", lines, eventSpent: t.spent, eventLeft: r2(t.eventCost - t.spent), cost: t.cost, revenue: t.revenue, opening: t.carryover, surplus: t.surplus, closing: r2(t.carryover + t.surplus) };
}

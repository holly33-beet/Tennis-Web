"use client";
import * as React from "react";
import { fmt } from "@/lib/budget";
import { SHEETS, YEARS_KEY, DATA_KEY, type Custom, useStored, sortYears, currentYear, yearReport } from "@/components/budget-view";

// Balance sheet by year, built from the Budget page (sheet years plus any years added there).
// Projected year-end position: equity = opening carryover + surplus. Cash is the balancing figure,
// so total assets always equal total liabilities plus total equity.

export function BalanceView() {
  const [years] = useStored<string[]>(YEARS_KEY, []);
  const [custom] = useStored<Record<string, Custom>>(DATA_KEY, {});
  const list = sortYears([...SHEETS, ...years]);
  const [sel, setSel] = React.useState(currentYear());
  const year = list.includes(sel) ? sel : list[list.length - 1];
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => { setTick((t) => t + 1); }, [year, years, custom]); // re-read Budget page data after it loads
  React.useEffect(() => { // pick up edits made on the Budget page (same tab or another tab)
    const bump = () => setTick((t) => t + 1);
    window.addEventListener("hashchange", bump); window.addEventListener("focus", bump); window.addEventListener("storage", bump);
    return () => { window.removeEventListener("hashchange", bump); window.removeEventListener("focus", bump); window.removeEventListener("storage", bump); };
  }, []);
  const r = React.useMemo(() => yearReport(year, custom), [year, custom, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const all = React.useMemo(() => list.map((y) => {
    const a = yearReport(y, custom);
    const b = a.lines.find((l) => l.label === "Balls")?.amount ?? 0;
    const add = b + a.eventLeft;
    return { ...a, cost: a.cost - add, surplus: a.surplus + add, closing: a.closing + add };
  }), [list.join(), custom, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Balls are recorded as an asset (stock of balls) instead of being spent, so their cost is added back to equity.
  // Event budget: only what was spent is an expense; the unspent part stays with the club as an asset.
  const balls = r.lines.find((l) => l.label === "Balls")?.amount ?? 0;
  const otherAssets = balls + r.eventLeft;
  const liabilities = 0; // the club has no liabilities; everything below comes from the Budget page
  const surplus = Math.round((r.surplus + balls + r.eventLeft) * 100) / 100;
  const equity = Math.round((r.opening + surplus) * 100) / 100;
  const cash = Math.round((equity + liabilities - otherAssets) * 100) / 100; // balancing figure
  const assets = cash + otherAssets;
  const diff = Math.round((assets - (liabilities + equity)) * 100) / 100;

  return (
    <>
      <h1 className="bud-title">Balance sheet<br />
        <span className="yearpick">
          <select value={year} onChange={(e) => setSel(e.target.value)} aria-label="Balance sheet year">
            {list.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="caret" aria-hidden>▾</span>
        </span>
      </h1>
      <p className="lede">Projected year-end position for {year}, from the Budget page{r.sheet ? ` (“${r.sheet}” sheet)` : ""}. Add years on the Budget page.</p>

      <div className="grid">
        <div className="card c4 tone-green"><span className="label">Total assets</span><div className="stat">{fmt(assets)}</div></div>
        <div className="card c4 tone-yellow"><span className="label">Total liabilities</span><div className="stat">{fmt(liabilities)}</div></div>
        <div className="card c4 tone-lav"><span className="label">Total equity</span><div className={`stat ${equity < 0 ? "neg" : ""}`}>{fmt(equity)}</div>
          <p className="small">{diff === 0 ? "✓ Assets = liabilities + equity" : `Off by ${fmt(diff)}`}</p></div>
      </div>

      <div className="grid" style={{ alignItems: "start" }}>
        <div className="card c6">
          <h2>Assets</h2>
          <table><tbody>
            <tr><th>Item</th><th className="n">Amount</th></tr>
            <tr><td>Cash (bank account)<div className="small">Balancing figure: equity + liabilities − other assets</div></td><td className={`n ${cash < 0 ? "neg" : ""}`}>{fmt(cash)}</td></tr>
            <tr><td>Balls<div className="small">Recorded as an asset at cost, not spent</div></td><td className="n">{fmt(balls)}</td></tr>
            {r.lines.some((l) => l.label === "Event budget") && <tr><td>Event budget left<div className="small">Unspent part of the event budget (from the Budget page)</div></td><td className="n">{fmt(r.eventLeft)}</td></tr>}
            <tr className="total"><td>Total assets</td><td className="n">{fmt(assets)}</td></tr>
          </tbody></table>
        </div>
        <div className="card c6">
          <h2>Liabilities</h2>
          <table><tbody>
            <tr><th>Item</th><th className="n">Amount</th></tr>
            <tr><td className="small" colSpan={2}>None. Everything on this page comes straight from the Budget page.</td></tr>
            <tr className="total"><td>Total liabilities</td><td className="n">{fmt(liabilities)}</td></tr>
          </tbody></table>
          <h2 style={{ marginTop: 24 }}>Equity</h2>
          <table><tbody>
            <tr><th>Item</th><th className="n">Amount</th></tr>
            <tr><td>Carryover from last year</td><td className="n">{fmt(r.opening)}</td></tr>
            <tr><td>Surplus or deficit this year<div className="small">Budget surplus {fmt(r.surplus)} + balls {fmt(balls)} + unspent event budget {fmt(r.eventLeft)}</div></td><td className={`n ${surplus < 0 ? "neg" : ""}`}>{fmt(surplus)}</td></tr>
            <tr className="total"><td>Total equity</td><td className="n">{fmt(equity)}</td></tr>
          </tbody></table>
          <p className="small" style={{ marginTop: 10 }}>Total liabilities + total equity = {fmt(liabilities + equity)}</p>
        </div>
      </div>

      <div className="grid" style={{ alignItems: "start" }}>
        <div className="card c6">
          <h2>Income and spending</h2>
          <table><tbody>
            <tr><th>Item</th><th className="n">Amount</th></tr>
            <tr><td>Total revenue{r.revenueNote && <div className="small">{r.revenueNote}</div>}</td><td className="n">{fmt(r.revenue)}</td></tr>
            {r.lines.filter((l) => l.label !== "Balls").map((l) => l.label === "Event budget"
              ? <tr key={l.label}><td>Event spending<div className="small">Events spent so far, out of the {fmt(l.amount)} event budget</div></td><td className="n">−{fmt(r.eventSpent)}</td></tr>
              : <tr key={l.label}><td>{l.label}</td><td className="n">−{fmt(l.amount)}</td></tr>)}
            <tr className="total"><td>Surplus or deficit</td><td className={`n ${surplus < 0 ? "neg" : ""}`}>{fmt(surplus)}</td></tr>
            <tr><td className="small" colSpan={2}>Balls ({fmt(balls)}) and the unspent event budget ({fmt(r.eventLeft)}) are listed under assets instead of here.</td></tr>
          </tbody></table>
        </div>
        <div className="card c6">
          <h2>All years</h2>
          <div className="scroll"><table><tbody>
            <tr><th /> {all.map((a) => <th key={a.year} className="n">{a.year}</th>)}</tr>
            {([["Carryover", "opening"], ["Revenue", "revenue"], ["Spending", "cost"], ["Surplus or deficit", "surplus"], ["Year-end equity", "closing"]] as const).map(([label, key]) => (
              <tr key={key} className={key === "closing" ? "total" : undefined}><td>{label}</td>{all.map((a) => <td key={a.year} className={`n ${a[key] < 0 ? "neg" : ""}`}>{fmt(a[key])}</td>)}</tr>
            ))}
          </tbody></table></div>
        </div>
      </div>
    </>
  );
}

"use client";
import * as React from "react";
import { fmt } from "@/lib/budget";
import { StatTile, Bars, Donut, PALETTE } from "@/components/dash";
import { SHEETS, YEARS_KEY, DATA_KEY, type Custom, useStored, sortYears, currentYear, yearReport } from "@/components/budget-view";

// Balance sheet by year, built from the Budget page (sheet years plus any years added there).
// Projected year-end position: equity = opening carryover + surplus. Cash is the balancing figure,
// so total assets always equal total liabilities plus total equity.

type Item = { id: string; name: string; amount: number };
type BS = { assets: Item[]; liabilities: Item[] };
const bsKey = (y: string) => `wtc-bs-v1:${y}`;

function ItemList({ items, onAdd, onRemove, kind, color }: { items: Item[]; onAdd: (i: Item) => void; onRemove: (id: string) => void; kind: string; color: string }) {
  const [name, setName] = React.useState("");
  const [amt, setAmt] = React.useState("");
  const add = () => {
    const a = parseFloat(amt);
    if (!name.trim() || !(a > 0)) return;
    onAdd({ id: String(Date.now()), name: name.trim(), amount: Math.round(a * 100) / 100 });
    setName(""); setAmt("");
  };
  return (
    <>
      {items.map((i) => (
        <div className="row" key={i.id}><span className="ic" style={{ background: color }}>{i.name.slice(0, 2)}</span>
          <div className="nm">{i.name}</div>
          <div className="am">{fmt(i.amount)} <button className="x" onClick={() => onRemove(i.id)} aria-label={`Remove ${i.name}`}>×</button></div></div>
      ))}
      <div className="bsadd" onKeyDown={(e) => { if (e.key === "Enter") add(); }}>
        <input className="inp" placeholder={`Add ${kind}`} value={name} onChange={(e) => setName(e.target.value)} aria-label={`${kind} name`} />
        <input className="inp" type="number" min="0" step="0.01" placeholder="$" value={amt} onChange={(e) => setAmt(e.target.value)} aria-label={`${kind} amount`} />
        <button className="btn sm" type="button" onClick={add}>Add</button>
      </div>
    </>
  );
}

export function BalanceView() {
  const [years] = useStored<string[]>(YEARS_KEY, []);
  const [custom] = useStored<Record<string, Custom>>(DATA_KEY, {});
  const list = sortYears([...SHEETS, ...years]);
  const [sel, setSel] = React.useState(currentYear());
  const year = list.includes(sel) ? sel : list[list.length - 1];
  const [bs, setBs] = useStored<BS>(bsKey(year), { assets: [], liabilities: [] });
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
  const otherAssets = bs.assets.reduce((a, i) => a + i.amount, 0) + balls + r.eventLeft;
  const liabilities = bs.liabilities.reduce((a, i) => a + i.amount, 0);
  const surplus = Math.round((r.surplus + balls + r.eventLeft) * 100) / 100;
  const equity = Math.round((r.opening + surplus) * 100) / 100;
  const cash = Math.round((equity + liabilities - otherAssets) * 100) / 100; // balancing figure
  const assets = cash + otherAssets;
  const diff = Math.round((assets - (liabilities + equity)) * 100) / 100;

  const spend = r.lines.filter((l) => l.label !== "Balls").map((l) => l.label === "Event budget" ? { label: "Event spending", amount: r.eventSpent } : l);
  const shortLabel = (l: string) => (/^Court fees: (?!.*day)/.test(l) ? "Extra courts" : l).replace("Court fees: ", "").replace(/s$/, "").replace(/^(Sun|Mon|Tues|Wednes|Thurs|Fri|Satur)day$/, (m) => m.slice(0, 3))
    .replace("Administrative fee", "Admin").replace("UTC memberships", "UTC").replace("Event spending", "Events").slice(0, 10);
  const Row = ({ ic, color, name, note, amount, neg }: { ic: string; color: string; name: string; note?: string; amount: number; neg?: boolean }) => (
    <div className="row"><span className="ic" style={{ background: color }}>{ic}</span>
      <div><div className="nm">{name}</div>{note && <div className="nt">{note}</div>}</div>
      <div className={`am ${neg ? "neg" : ""}`}>{fmt(amount)}</div></div>
  );

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

      <div className="dash">
        <div className="dash-main">
          <div className="tiles three">
            <StatTile tone="blue" label="Total assets" value={assets} sub="Cash, balls, unspent event budget" />
            <StatTile tone="yellow" label="Total liabilities" value={liabilities} sub={bs.liabilities.length ? `${bs.liabilities.length} item${bs.liabilities.length > 1 ? "s" : ""}` : "None recorded"} />
            <StatTile tone="green" label="Total equity" value={equity} neg={equity < 0} pill={diff === 0 ? "✓ Balanced" : `Off ${fmt(diff)}`} sub="Assets = liabilities + equity" />
          </div>

          <section>
            <div className="dash-sec-head">
              <div><h3>Spending by category</h3><div className="dash-big">{fmt(spend.reduce((a, l) => a + l.amount, 0))}</div></div>
              <span className="sub">Balls and the unspent event budget are assets, so they are not counted here.</span>
            </div>
            <Bars data={spend.map((l) => ({ label: shortLabel(l.label), value: l.amount, note: l.label }))} />
          </section>

          <section>
            <div className="dash-sec-head"><div><h3>Assets</h3><div className="sub">Cash is the balancing figure: equity + liabilities − other assets.</div></div><b className="dash-big" style={{ fontSize: 18, marginTop: 0 }}>{fmt(assets)}</b></div>
            <div className="rows">
              <Row ic="$" color={PALETTE[0]} name="Cash (bank account)" note="Balancing figure" amount={cash} neg={cash < 0} />
              <Row ic="Ba" color={PALETTE[3]} name="Balls" note="Recorded as an asset at cost" amount={balls} />
              {r.lines.some((l) => l.label === "Event budget") && <Row ic="Ev" color={PALETTE[4]} name="Event budget left" note="Unspent part of the event budget" amount={r.eventLeft} />}
              <ItemList kind="asset" color={PALETTE[6]} items={bs.assets} onAdd={(i) => setBs((b) => ({ ...b, assets: [...b.assets, i] }))} onRemove={(id) => setBs((b) => ({ ...b, assets: b.assets.filter((x) => x.id !== id) }))} />
            </div>
          </section>

          <section>
            <div className="dash-sec-head"><div><h3>Liabilities and equity</h3><div className="sub">Total liabilities + total equity = {fmt(liabilities + equity)}</div></div><b className="dash-big" style={{ fontSize: 18, marginTop: 0 }}>{fmt(liabilities + equity)}</b></div>
            <div className="rows">
              {bs.liabilities.length === 0 && <div className="row"><span /><div className="nt">No liabilities recorded.</div><span /></div>}
              <ItemList kind="liability" color={PALETTE[2]} items={bs.liabilities} onAdd={(i) => setBs((b) => ({ ...b, liabilities: [...b.liabilities, i] }))} onRemove={(id) => setBs((b) => ({ ...b, liabilities: b.liabilities.filter((x) => x.id !== id) }))} />
              <Row ic="Ca" color="#1F2A37" name="Carryover from last year" amount={r.opening} />
              <Row ic="±" color="#1F2A37" name="Surplus or deficit this year" note={`Budget surplus ${fmt(r.surplus)} + balls ${fmt(balls)} + unspent event budget ${fmt(r.eventLeft)}`} amount={surplus} neg={surplus < 0} />
              <div className="row total"><span /><div className="nm">Total equity</div><div className="am">{fmt(equity)}</div></div>
            </div>
          </section>
        </div>

        <aside className="dash-side">
          <div className="side-top">
            <h3>What the club holds</h3>
            <div className="sub">Share of total assets</div>
            <Donut centerLabel="Assets" centerValue={assets} items={[
              { label: "Cash", value: Math.max(0, cash), color: PALETTE[0] },
              { label: "Balls", value: balls, color: PALETTE[3] },
              { label: "Event budget left", value: r.eventLeft, color: PALETTE[4] },
              ...bs.assets.map((a, i) => ({ label: a.name, value: a.amount, color: PALETTE[(i + 5) % PALETTE.length] })),
            ]} />
          </div>
          <div className="side-body">
            <h3>Income and spending</h3>
            <div className="side-card"><div><div className="nm">Total revenue</div>{r.revenueNote && <div className="nt">{r.revenueNote}</div>}</div><span className="am">{fmt(r.revenue)}</span><span /></div>
            {spend.map((l) => <div className="side-card" key={l.label}><div className="nm">{l.label}</div><span className="am">−{fmt(l.amount)}</span><span /></div>)}
            <div className="side-card"><div className="nm"><b>Surplus or deficit</b></div><span className={`am ${surplus < 0 ? "neg" : ""}`}>{fmt(surplus)}</span><span /></div>

            <h3 style={{ marginTop: 14 }}>All years</h3>
            <div className="scroll"><table className="yrs"><tbody>
              <tr><th /> {all.map((a) => <th key={a.year} className="n">{a.year}</th>)}</tr>
              {([["Carryover", "opening"], ["Revenue", "revenue"], ["Spending", "cost"], ["Surplus", "surplus"], ["Equity", "closing"]] as const).map(([label, key]) => (
                <tr key={key} className={key === "closing" ? "total" : undefined}><td>{label}</td>{all.map((a) => <td key={a.year} className={`n ${a[key] < 0 ? "neg" : ""}`}>{fmt(a[key])}</td>)}</tr>
              ))}
            </tbody></table></div>
            <p className="small">Assets and liabilities you add save in this browser.</p>
          </div>
        </aside>
      </div>
    </>
  );
}

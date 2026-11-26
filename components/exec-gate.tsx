"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

// Exec-only gate. Client-side only: it keeps casual visitors out but is NOT real security,
// because the figures ship in the page bundle. For real protection, host behind a login.
const CODE = "123"; // temporary passcode (Holly, 2026-11-26); change before sharing

export function ExecGate({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  useEffect(() => {
    try { setOk(sessionStorage.getItem("wtc-exec") === "1"); } catch { setOk(false); }
  }, []);
  const tryCode = () => {
    if (val.trim() === CODE) { try { sessionStorage.setItem("wtc-exec", "1"); } catch {} setOk(true); window.dispatchEvent(new Event("wtc-exec")); } else setErr(true);
  };
  if (ok) return <>{children}</>;
  return (
    <>
      <main style={{ filter: "blur(14px)", pointerEvents: "none", userSelect: "none" }} aria-hidden>{ok === false ? children : null}</main>
      {ok === false && (
        <div className="gate">
          {/* No <form>: sandboxed previews block form submission, so unlock on button click or Enter key. */}
          <div className="gate-card" role="dialog" aria-label="Exec only">
            <span className="dot" />
            <h2>Exec only</h2>
            <p>The finance pages are for the Western Tennis Club executive. Enter the exec passcode to continue.</p>
            <input type="password" placeholder="Passcode" aria-label="Passcode" autoComplete="off" value={val}
              onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); tryCode(); } }} />
            <button className="btn" type="button" onClick={tryCode}>Enter</button>
            {err && <p className="err">That passcode is not right.</p>}
            <Link href="/">Back to home</Link>
          </div>
        </div>
      )}
    </>
  );
}

export function ExecNotice() {
  return (
    <div className="notice"><span className="dot" style={{ marginTop: 6 }} /><div><b>Exec only.</b> Club finances, for the executive team. Please don’t share this page outside the exec.</div></div>
  );
}

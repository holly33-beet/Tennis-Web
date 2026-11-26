import type { Metadata } from "next";
import { ExecGate, ExecNotice } from "@/components/exec-gate";

export const metadata: Metadata = { title: "Progress · WTC" };

// Progress = sign-up tracking (Holly, 2026-11-26). Content cleared until the sign-up data source is decided.
export default function Progress() {
  return (
    <ExecGate>
      <main>
        <ExecNotice />
        <h1>Progress.</h1>
        <p className="lede">Sign-up tracking. Coming soon.</p>
        <div className="card ph" style={{ minHeight: 220, display: "grid", placeItems: "center", textAlign: "center" }}>
          <p className="small">Nothing here yet.</p>
        </div>
      </main>
    </ExecGate>
  );
}

import type { Metadata } from "next";
import { ExecGate, ExecNotice } from "@/components/exec-gate";
import { SignupsView } from "@/components/signups-view";

export const metadata: Metadata = { title: "Progress · WTC" };

// Progress = sign-up tracking (Holly, 2026-11-26). Reads the Google Form responses live on load
// via the Apps Script in signups-apps-script.gs. See SIGNUPS-SETUP.md.
export default function Progress() {
  return (
    <ExecGate>
      <main>
        <ExecNotice />
        <h1>Progress.</h1>
        <p className="lede">Session sign-ups, read from the Google Form every time this page opens.</p>
        <SignupsView />
      </main>
    </ExecGate>
  );
}

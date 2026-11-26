import type { Metadata } from "next";
import { ExecGate, ExecNotice } from "@/components/exec-gate";
import { BalanceView } from "@/components/balance-view";

export const metadata: Metadata = { title: "Balance Sheet · WTC" };

export default function Balance() {
  return (
    <ExecGate>
      <main className="fin">
        <ExecNotice />
        <BalanceView />
      </main>
    </ExecGate>
  );
}

import type { Metadata } from "next";
import { ExecGate, ExecNotice } from "@/components/exec-gate";
import { BudgetView } from "@/components/budget-view";

export const metadata: Metadata = { title: "Yearly Budget · WTC" };

export default function Budget() {
  return (
    <ExecGate>
      <main className="fin">
        <ExecNotice />
        <BudgetView />
      </main>
    </ExecGate>
  );
}

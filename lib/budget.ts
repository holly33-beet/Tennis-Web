// Source: "Budget '26-'27" tab, Western Tennis Club Budget sheet (read 2026-11-26). Read-only copy.
export type Expense = { name: string; amount: number; note: string; flag?: string };
export type SessionDay = { cost: number; dates: string[]; skipped: string[] };

export const WTC = {
  inputs: {
    courtRate: 38.42, fullYearMembers: 101, fullYearFee: 295, winterMembers: 10, winterFee: 200,
    startingCarryover: 8713.42, adminFeePerMember: 25, utcFeePerMember: 112,
    sundayCourts: 6, midweekCourts: 3, hoursPerSession: 2, weeklyPlayerHours: 96
  },
  sessions: {
    Sunday: { cost: 461.04, dates: ["2026-09-27","2026-10-04","2026-10-25","2026-11-01","2026-11-08","2026-11-15","2026-11-22","2026-11-29","2027-01-17","2027-01-24","2027-01-31","2027-02-07","2027-02-28","2027-03-07","2027-03-14","2027-03-21"],
              skipped: ["2027-02-21","2027-03-28"] },
    Wednesday: { cost: 230.52, dates: ["2026-09-30","2026-10-07","2026-10-21","2026-10-28","2026-11-04","2026-11-11","2026-11-18","2026-11-25","2026-12-02","2027-01-20","2027-01-27","2027-02-03","2027-02-10","2027-02-24","2027-03-03","2027-03-10","2027-03-17","2027-03-24","2027-03-31"], skipped: [] },
    Thursday: { cost: 230.52, dates: ["2026-10-01","2026-10-08","2026-10-22","2026-10-29","2026-11-05","2026-11-12","2026-11-19","2026-11-26","2026-12-03","2027-01-21","2027-01-28","2027-02-04","2027-02-11","2027-02-25","2027-03-04","2027-03-11","2027-03-18","2027-03-25","2027-04-01"], skipped: [] }
  },
  eventBudgetStart: 1000, // from the sheet's "Event budget" line; editable on the Budget page
  otherExpenses: [
    { name: "Balls", amount: 650.00, note: "Core operating cost" },
    { name: "Event budget", amount: 1000.00, note: "" },
    { name: "AGM food cost", amount: 331.91, note: "" },
    { name: "Administrative fee", amount: 2625.00, note: "Full-year × $25 + winter × $12.50", flag: "Formula gives $2,650 (101 × $25 + 10 × $12.50). Sheet shows $2,625." },
    { name: "UTC memberships", amount: 12320.00, note: "Members × $112", flag: "$12,320 = 110 × $112. Inputs give 111 members (101 + 10) = $12,432." }
  ],
  summary: {
    courtCosts: 16136.40, otherExpenses: 16926.91, totalCost: 33063.31, revenue: 31795.00,
    surplus: -1268.31, startingCarryover: 8713.42, endingCarryover: 7445.11
  },
  calendar: [
    ["Sep 21–25", "Clubs Week"], ["Sep 27", "Fall season starts"], ["Oct 11–17", "Fall reading week"],
    ["Dec 5", "Fall season ends"], ["Jan 17", "Winter season starts"], ["Feb 14–20", "Winter reading week"],
    ["Mar 1", "Exec election results due"], ["Mar 26", "Good Friday, no sessions"], ["Apr 3", "Season ends"]
  ]
} as {
  inputs: Record<string, number>;
  sessions: Record<"Sunday" | "Wednesday" | "Thursday", SessionDay>;
  eventBudgetStart: number;
  otherExpenses: Expense[];
  summary: { courtCosts: number; otherExpenses: number; totalCost: number; revenue: number; surplus: number; startingCarryover: number; endingCarryover: number };
  calendar: [string, string][];
};

export const fmt = (n: number) =>
  (n < 0 ? "−$" : "$") + Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const term = (iso: string) => (+iso.slice(5, 7) >= 8 ? "Fall" : "Winter");
export const longDate = (iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-CA", opts);

// ---- Year-by-year sheet data -------------------------------------------------------------
export type SheetYear = {
  source: string;
  sessions: Record<string, SessionDay & { note: string }>;
  expenses: Expense[];
  eventBudgetStart: number | null; // null = no event budget line that year
  seedEvents?: { id: string; name: string; date: string; amount: number; note?: string }[];
  retiredSeeds?: string[];
  courtExtras?: { name: string; amount: number; note?: string }[]; // one-off court bookings outside the weekly sessions
  revenue: number; revenueNote: string;
  carryover: number; carryoverFlag?: string;
};

const sheet2627: SheetYear = {
  source: "Budget ’26–’27",
  sessions: Object.fromEntries(Object.entries(WTC.sessions).map(([d, o]) => [d, { ...o, note: `${o.dates.length} sessions × ${fmt(o.cost)}` }])),
  expenses: [
    { name: "Balls", amount: 650, note: "" },
    { ...WTC.otherExpenses.find((e) => e.name === "Administrative fee")! },
    { ...WTC.otherExpenses.find((e) => e.name === "UTC memberships")! },
  ],
  // AGM food ($331.91 in the sheet) is part of the event budget (Holly, 2026-11-26), so it starts as an event.
  seedEvents: [
    { id: "agm-food", name: "AGM food", date: "", amount: 331.91 },
    // "Fall 2026 WTC Open expenses" table (Holly, 2026-11-26): the trophy is an event cost; the court booking is a court fee (below).
    { id: "wtc-open-f26-trophy", name: "Fall 2026 WTC Open: trophy", date: "", amount: 40.64 },
  ],
  retiredSeeds: ["wtc-open-f26-courts"], // was briefly an event; it belongs in court fees
  courtExtras: [{ name: "Fall 2026 WTC Open court bookings", amount: 115.26, note: "3 extra courts for 1 hour; 6 courts for 1 hour not charged because of a cancelled session" }],
  eventBudgetStart: WTC.eventBudgetStart,
  revenue: WTC.summary.revenue, revenueNote: "101 full-year × $295 + 10 winter × $200",
  carryover: WTC.summary.startingCarryover,
  carryoverFlag: "2025–26 ended at $6,307.66 by its own sheet ($6,039.66 + $268.00). This sheet starts at $8,713.42, presumably the actual figure.",
};

// Source: "Budget '25-'26" tab (read 2026-11-26). Courts at $38.50/hour (rounded from $38.42).
const sheet2526: SheetYear = {
  source: "Budget ’25–’26",
  sessions: {
    Sunday: { cost: 462, note: "18 days × 6 courts × 2 hours × $38.50", skipped: [],
      dates: ["2025-09-21","2025-09-28","2025-10-05","2025-10-19","2025-10-26","2025-11-16","2025-11-23","2025-11-30","2025-12-07","2026-01-18","2026-01-25","2026-02-01","2026-02-08","2026-03-01","2026-03-08","2026-03-15","2026-03-22","2026-03-29"] },
    Saturday: { cost: 115.5, note: "16 days × 3 courts × 1 hour × $38.50", skipped: [],
      dates: ["2025-10-04","2025-10-18","2025-10-25","2025-11-15","2025-11-22","2025-11-29","2025-12-06","2026-01-17","2026-01-24","2026-01-31","2026-02-07","2026-02-28","2026-03-07","2026-03-14","2026-03-21","2026-03-28"] },
  },
  expenses: [
    { name: "Balls", amount: 900, note: "24 × 6 = 144 cans" },
    { name: "Tournament prizes", amount: 25, note: "" },
    { name: "Extra tournament fees", amount: 693, note: "3 extra hours on a Saturday is $346.50 per tournament" },
    { name: "Tournament medals", amount: 100, note: "" },
    { name: "Administrative fee", amount: 1875, note: "75 members × $25" },
    { name: "UTC memberships", amount: 8400, note: "75 × $112 ($99 + HST)" },
  ],
  eventBudgetStart: null,
  revenue: 22425, revenueNote: "75 members × $299",
  carryover: 6039.66,
};

export const SHEET_YEARS: Record<string, SheetYear> = { "2025–26": sheet2526, "2026–27": sheet2627 };

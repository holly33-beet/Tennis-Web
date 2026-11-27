"use client";
import { HomeFolders } from "@/components/home-folders";
import { BASE } from "@/lib/base-path";

// Home navigation (was the Warp Carousel; now glass folders, per Holly 2026-11-26).
export function BudgetCarousel() {
  return <HomeFolders hrefs={{ budget: `${BASE}/budget/`, balance: `${BASE}/balance/`, progress: `${BASE}/progress/` }} />;
}

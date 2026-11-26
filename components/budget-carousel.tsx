"use client";
import { HomeFolders } from "@/components/home-folders";

// Home navigation (was the Warp Carousel; now glass folders, per Holly 2026-11-26).
export function BudgetCarousel() {
  return <HomeFolders hrefs={{ budget: "/budget/", balance: "/balance/", progress: "/progress/" }} />;
}

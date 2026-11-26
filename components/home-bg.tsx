"use client";
import { useEffect } from "react";
// Turns on the painted-court background while the home page is shown.
export function HomeBg() {
  useEffect(() => {
    document.body.classList.add("home-bg");
    return () => document.body.classList.remove("home-bg");
  }, []);
  return null;
}

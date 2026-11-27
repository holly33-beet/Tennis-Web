"use client";
import * as React from "react";
import { WarpCarousel, type WarpCard } from "@/components/ui/warp-carousel";

// Home-page carousel: one card per finance page, showing only the page name, each linked to that page.
// Colours: two-tone vertical gradients from Holly's reference palettes (top colour → bottom colour).
function hex(h: string) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function gradientMesh(top: string, bottom: string): string[] {
  const A = hex(top), B = hex(bottom), out: string[] = [];
  for (let r = 0; r < 7; r++) {
    const t = r / 6, k = t < 0.3 ? 0 : t > 0.8 ? 1 : (t - 0.3) / 0.5, e = k * k * (3 - 2 * k);
    const c = A.map((a, i) => Math.round(a + (B[i] - a) * e));
    const css = "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
    for (let col = 0; col < 6; col++) out.push(css);
  }
  return out;
}
const card = (value: string, top: string, bottom: string, ink: string): WarpCard => ({
  title: "", value, detail: "none", mesh: gradientMesh(top, bottom), numeral: [ink, ink], glow: top, accent: top,
});

export type PageKey = "budget" | "balance" | "progress";
export const PAGES: { key: PageKey; name: string; card: WarpCard }[] = [
  { key: "budget", name: "Budget", card: card("Budget", "#0E61AC", "#FAF2E0", "#0E61AC") }, // 沧溟蓝 → 玉釉杏
  { key: "balance", name: "Balance sheet", card: card("Balance\nsheet", "#73AE52", "#FBF1D7", "#5E9442") }, // 青岚色 → 云腴色
  { key: "progress", name: "Sign up", card: card("Sign up", "#F4DC84", "#79BEDF", "#ffffff") }, // 缃云黄 → 晴川蓝
];
const cards = PAGES.map((p) => p.card);

// Card text uses the heading font (CSS var --font-head, editable in the typography editor).
function useHeadFont() {
  const [font, setFont] = React.useState("Georgia, serif");
  React.useEffect(() => {
    const read = () => {
      const f = getComputedStyle(document.documentElement).getPropertyValue("--font-head").trim() || "Georgia";
      const stack = `${f}, Georgia, serif`;
      const done = () => setFont(stack);
      document.fonts ? document.fonts.load(`300 50px ${f}`).then(done, done) : done();
    };
    read();
    window.addEventListener("wtc-type", read);
    return () => window.removeEventListener("wtc-type", read);
  }, []);
  return font;
}

export function HomeCarousel({ hrefs }: { hrefs: Record<PageKey, string> }) {
  // Click the front card to open its page; click a side card (or drag / arrow keys) to spin.
  const font = useHeadFont();
  return (
    <div style={{ borderRadius: 28, overflow: "hidden", height: "clamp(420px, 56vw, 600px)", cursor: "pointer" }}>
      <WarpCarousel
        cards={cards}
        step={1}
        interval={5}
        background="transparent"
        font={font}
        ariaLabel="Club finance pages: click the front card to open it"
        onFrontClick={(i) => { window.location.href = hrefs[PAGES[i].key]; }}
      />
    </div>
  );
}

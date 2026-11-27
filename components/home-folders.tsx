"use client";
import * as React from "react";
import GlassFolder, { type ArtRecipe, type FolderFile } from "@/components/ui/glass-folder-cards";

// Home: three glass folders, one per finance page. Click a folder to go straight to that page.
// Folder art uses Holly's two-tone palettes.
export type PageKey = "budget" | "balance" | "progress";

const art = (colors: string[], angle: number): ArtRecipe => ({ style: "streak", colors, scale: 0.7, warp: 1.5, angle, gloss: 0.2, veins: 0 });

const FOLDERS: { key: PageKey; label: string; art: ArtRecipe; seed: number; sheets: string[] }[] = [
  { key: "budget", label: "Budget", art: art(["#FAF2E0", "#9DBBD8", "#0E61AC", "#0A4A85", "#FAF2E0"], -0.6), seed: 3, sheets: ["Breakdown", "Court fees", "Event budget"] }, // 沧溟蓝 / 玉釉杏
  { key: "balance", label: "Balance sheet", art: art(["#FBF1D7", "#B8D39A", "#73AE52", "#4F8A36", "#FBF1D7"], 0.4), seed: 7, sheets: ["Assets", "Liabilities", "Equity"] }, // 青岚色 / 云腴色
  { key: "progress", label: "Sign up", art: art(["#79BEDF", "#B9D8C8", "#F4DC84", "#E9C65A", "#79BEDF"], -0.3), seed: 11, sheets: ["Sign-ups"] }, // 缃云黄 / 晴川蓝
];

function useWidth() {
  const [w, setW] = React.useState(300);
  React.useEffect(() => {
    const f = () => setW(Math.max(260, Math.min(320, window.innerWidth - 48)));
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  return w;
}

export function HomeFolders({ hrefs }: { hrefs: Record<PageKey, string> }) {
  const width = useWidth();
  return (
    <div className="folders">
      {FOLDERS.map((f, i) => {
        const files: FolderFile[] = f.sheets.map((name) => ({ name, href: hrefs[f.key] }));
        return <GlassFolder key={f.key} label={f.label} meta="" art={f.art} seed={f.seed} files={files} action="none" href={hrefs[f.key]} width={width} appearDelay={i * 140} />;
      })}
    </div>
  );
}

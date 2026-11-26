# Western Tennis Club website

Club site with exec-only finance pages: Budget, Balance sheet and Progress.

Two versions of the same site:
- `western-tennis-club.html`: one self-contained file. Open it in a browser and edit it directly.
- Next.js app (App Router, TypeScript, Tailwind v4, shadcn structure) in this folder.

## Run the Next.js app
    npm install
    npm run dev        # http://localhost:3000
    npm run build      # static site in out/

## Where things are
- `lib/budget.ts`: budget numbers for 2025–26 and 2026–27, copied from the club budget sheet on 2026-11-26.
- `components/budget-view.tsx`: Budget page (year picker, cost calculators, court calendar, event budget).
- `components/balance-view.tsx`: Balance sheet (assets = liabilities + equity, cash is the balancing figure).
- `components/dash.tsx`: dashboard pieces (stat tiles, bar chart, donut) used by Budget and Balance sheet.
- `components/exec-gate.tsx`: exec passcode gate. Client-side only, so it is not real security.
- `components/home-folders.tsx`, `components/ui/glass-folder-cards.tsx`: home page folders.
- `public/ripple.js`: water ripple effect. `public/type-editor.js`: the "Aa" site editor.
- `backgrounds/`: generated background images (09 is in use) and `generator.html`.
- `tools/single-file-entry.tsx`: entry used to bundle the React parts into the single HTML file with esbuild.

## Notes
- Edits people make on the site (calculators, events, balance sheet items) save in their own browser only.
- Headings use Playfair Display as a free stand-in for Balennia (paid font).

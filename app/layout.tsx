import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import Script from "next/script";
import { Nav } from "@/components/nav";
import "./globals.css";

const interTight = Inter_Tight({ subsets: ["latin"], weight: ["400", "500", "700", "800"], variable: "--font-inter-tight" });

export const metadata: Metadata = {
  title: "Western Tennis Club",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={interTight.variable}>
      <head>
        {/* Fonts offered in the typography editor */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400..900;1,400..900&amp;family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&amp;family=DM+Sans:wght@300..800&amp;family=Poppins:wght@300;400;500;600;700&amp;family=DM+Serif+Display:ital@0;1&amp;family=Instrument+Serif:ital@0;1&amp;family=Inter+Tight:ital,wght@0,300..800;1,300..800&amp;family=Inter:wght@300..800&amp;family=Libre+Caslon+Display&amp;family=Manrope:wght@300..800&amp;family=Playfair+Display:ital,wght@0,400..900;1,400..900&amp;display=swap" />
      </head>
      <body>
        <div className="wrap">
          <Nav />
          {children}
          <footer>Western Tennis Club · Figures copied from the club budget sheet on Nov 26, 2026. Not live.</footer>
        </div>
        {/* Water ripple on the home background (only runs while body has .home-bg) */}
        <Script src="/ripple.js" strategy="afterInteractive" />
        {/* Typography editor: floating Aa button */}
        <Script src="/type-editor.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}

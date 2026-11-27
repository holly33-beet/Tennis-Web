"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { SIGNUPS } from "@/lib/signups-config";
import { BASE } from "@/lib/base-path";

// Changes on every deploy so browsers fetch the new signups.js instead of a cached copy.
const BUILD = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

type Mount = (el: HTMLElement, cfg: typeof SIGNUPS) => void;

// Live sign-ups from the Google Form. Rendering lives in public/signups.js so the
// single-file site uses exactly the same code. Only fetches once the exec gate is unlocked.
export function SignupsView() {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let exec = false;
    try { exec = sessionStorage.getItem("wtc-exec") === "1"; } catch {}
    const api = (window as unknown as { WTCSignups?: { mount: Mount } }).WTCSignups;
    if (ready && exec && api && ref.current) api.mount(ref.current, SIGNUPS);
  }, [ready]);
  return (
    <>
      <Script src={`${BASE}/signups.js?v=${BUILD}`} strategy="afterInteractive" onReady={() => setReady(true)} />
      <div ref={ref} className="su-root" />
    </>
  );
}

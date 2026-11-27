"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BASE } from "@/lib/base-path";

const links = [
  ["/", "Home"],
  ["/budget", "Budget"],
  ["/balance", "Balance sheet"],
  ["/progress", "Progress"],
] as const;

export function Nav() {
  const path = usePathname().replace(/\/$/, "") || "/";
  const [exec, setExec] = useState(false);
  useEffect(() => {
    const check = () => { try { setExec(sessionStorage.getItem("wtc-exec") === "1"); } catch { setExec(false); } };
    check(); window.addEventListener("wtc-exec", check);
    return () => window.removeEventListener("wtc-exec", check);
  }, [path]);
  const logout = () => { try { sessionStorage.removeItem("wtc-exec"); } catch {} window.location.href = `${BASE}/`; };
  return (
    <nav>
      <Link className="logo" href="/"><span className="dot" />Western Tennis Club</Link>
      <ul>
        {links.map(([href, label]) => (
          <li key={href}><Link href={href} className={path === href ? "on" : ""}>{label}</Link></li>
        ))}
        {exec && <li><button className="logout" onClick={logout}>Log out</button></li>}
      </ul>
    </nav>
  );
}

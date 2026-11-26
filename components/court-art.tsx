// Placeholder top-down court illustration until the painted artwork is supplied.
export function CourtArt({ bg = "#2a5fb8", court = "#2F6FD6" }: { bg?: string; court?: string }) {
  return (
    <svg viewBox="0 0 800 350" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><filter id="tx"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves={3} /><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .18 0" /><feComposite in2="SourceGraphic" operator="in" /></filter></defs>
      <rect width="800" height="350" fill={bg} /><rect x="140" y="45" width="520" height="260" fill={court} />
      <g fill="none" stroke="#fff" strokeWidth="4"><rect x="140" y="45" width="520" height="260" /><line x1="140" y1="77" x2="660" y2="77" /><line x1="140" y1="273" x2="660" y2="273" /><line x1="270" y1="77" x2="270" y2="273" /><line x1="530" y1="77" x2="530" y2="273" /><line x1="270" y1="175" x2="530" y2="175" /></g>
      <line x1="400" y1="35" x2="400" y2="315" stroke="#111" strokeWidth="5" /><line x1="408" y1="35" x2="408" y2="315" stroke="rgba(0,0,0,.25)" strokeWidth="6" />
      <circle cx="215" cy="120" r="11" fill="#F3EBD3" /><ellipse cx="238" cy="132" rx="22" ry="8" fill="rgba(0,0,0,.28)" />
      <circle cx="590" cy="235" r="11" fill="#F3EBD3" /><ellipse cx="613" cy="247" rx="22" ry="8" fill="rgba(0,0,0,.28)" />
      <circle cx="470" cy="150" r="5" fill="#E8D84A" /><ellipse cx="480" cy="155" rx="6" ry="2.5" fill="rgba(0,0,0,.25)" />
      <rect width="800" height="350" filter="url(#tx)" fill="#000" />
    </svg>
  );
}

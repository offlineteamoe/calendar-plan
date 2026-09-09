// Marca propia (no tenemos los archivos de marca de Open English acá):
// grilla de calendario abstracta con una celda activa, en degradé.

export function LogoMark({ size = 28, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={glow ? 'logo-mark-glow' : undefined}
    >
      <defs>
        <linearGradient id="lm-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F8BFF" />
          <stop offset="1" stopColor="#0B2E8A" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#lm-grad)" />
      <rect x="7" y="9" width="18" height="16" rx="2.5" stroke="white" strokeOpacity="0.92" strokeWidth="1.6" />
      <path d="M7 14h18" stroke="white" strokeOpacity="0.92" strokeWidth="1.6" />
      <path d="M11 6.5v4M21 6.5v4" stroke="white" strokeOpacity="0.92" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="16.5" y="16.5" width="5" height="5" rx="1.3" fill="white" />
    </svg>
  )
}

export function Logo({ size = 26, withWordmark = true, glow = false }: { size?: number; withWordmark?: boolean; glow?: boolean }) {
  return (
    <span className="logo">
      <LogoMark size={size} glow={glow} />
      {withWordmark && <span className="logo-word">Offline Planning</span>}
    </span>
  )
}

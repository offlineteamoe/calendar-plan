// Marca simple 2D: una grilla de calendario abstracta con una celda
// "activa" en degradé — evita depender de un logo de Open English real
// (no tenemos los archivos de marca acá) mientras mantiene una identidad
// propia coherente en toda la app.

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="lm-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B7CFF" />
          <stop offset="1" stopColor="#0B2E8A" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#lm-grad)" />
      <rect x="7" y="9" width="18" height="16" rx="2.5" stroke="white" strokeOpacity="0.9" strokeWidth="1.6" />
      <path d="M7 14h18" stroke="white" strokeOpacity="0.9" strokeWidth="1.6" />
      <path d="M11 6.5v4M21 6.5v4" stroke="white" strokeOpacity="0.9" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="16.5" y="16.5" width="5" height="5" rx="1.2" fill="white" />
    </svg>
  )
}

export function Logo({ size = 28, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      {withWordmark && <span className="logo-word">Plan de Pauta</span>}
    </span>
  )
}

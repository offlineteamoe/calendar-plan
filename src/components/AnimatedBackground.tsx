import { useEffect, useRef } from 'react'

/**
 * Fondo animado: auroras difusas en CSS + una red de partículas en canvas.
 * Se hace a mano (sin librerías) para no cargar dependencias por un adorno,
 * y se apaga solo si el usuario pidió menos movimiento.
 */
export function AnimatedBackground({ density = 0.00009 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let dots: { x: number; y: number; vx: number; vy: number }[] = []
    let frame = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(120, Math.max(28, Math.round(width * height * density)))
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      for (const d of dots) {
        if (!reduced) {
          d.x += d.vx
          d.y += d.vy
          if (d.x < 0 || d.x > width) d.vx *= -1
          if (d.y < 0 || d.y > height) d.vy *= -1
        }
      }

      // Líneas entre partículas cercanas — da la sensación de "red".
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x
          const dy = dots[i].y - dots[j].y
          const dist2 = dx * dx + dy * dy
          if (dist2 > 20000) continue
          const alpha = (1 - dist2 / 20000) * 0.3
          ctx.strokeStyle = `rgba(140, 180, 255, ${alpha})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(dots[i].x, dots[i].y)
          ctx.lineTo(dots[j].x, dots[j].y)
          ctx.stroke()
        }
      }

      for (const d of dots) {
        ctx.fillStyle = 'rgba(190, 215, 255, 0.55)'
        ctx.beginPath()
        ctx.arc(d.x, d.y, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }

      if (!reduced) frame = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(frame)
    }
  }, [density])

  return (
    <div className="bg-canvas-wrap" aria-hidden="true">
      <div className="bg-aurora bg-aurora-1" />
      <div className="bg-aurora bg-aurora-2" />
      <div className="bg-aurora bg-aurora-3" />
      <canvas ref={canvasRef} className="bg-canvas" />
      <div className="bg-grid" />
    </div>
  )
}

'use client'

import { useEffect, useRef } from 'react'

/**
 * Drifting ember dust on a canvas — the atmosphere of a spotlit stage.
 * Cheap: ~90 particles, pauses when off-screen or when motion is reduced.
 */
export function Dust({
  className,
  color = '245, 138, 7',
  density = 90,
}: {
  className?: string
  color?: string
  density?: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let running = true
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    type P = { x: number; y: number; r: number; vx: number; vy: number; a: number; t: number }
    let particles: P[] = []

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      particles = Array.from({ length: density }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.8,
        vx: -0.08 + Math.random() * 0.16,
        vy: -0.12 - Math.random() * 0.25,
        a: 0.15 + Math.random() * 0.5,
        t: Math.random() * Math.PI * 2,
      }))
    }

    const tick = () => {
      if (!running) return
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.t += 0.01
        p.x += p.vx + Math.sin(p.t) * 0.08
        p.y += p.vy
        if (p.y < -4) {
          p.y = h + 4
          p.x = Math.random() * w
        }
        if (p.x < -4) p.x = w + 4
        if (p.x > w + 4) p.x = -4
        const alpha = p.a * (0.6 + 0.4 * Math.sin(p.t * 2))
        ctx.beginPath()
        ctx.fillStyle = `rgba(${color}, ${alpha})`
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(([entry]) => {
      running = Boolean(entry?.isIntersecting)
      if (running) raf = requestAnimationFrame(tick)
      else cancelAnimationFrame(raf)
    })

    resize()
    io.observe(canvas)
    window.addEventListener('resize', resize)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [color, density])

  return <canvas ref={ref} className={className} aria-hidden />
}

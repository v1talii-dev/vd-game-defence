import type Phaser from 'phaser'

/** Процедурные текстуры эффектов: тень, свечение, дым, кольцо, воронка, виньетка */
export function ensureFxTextures(scene: Phaser.Scene) {
  const tm = scene.textures
  if (tm.exists('fx_shadow')) return
  const make = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
    const t = tm.createCanvas(key, w, h)!
    draw(t.getContext())
    t.refresh()
  }
  const radial = (
    c: CanvasRenderingContext2D,
    w: number,
    h: number,
    stops: [number, string][],
    squash = 1,
  ) => {
    c.save()
    c.translate(w / 2, h / 2)
    c.scale(1, squash)
    const g = c.createRadialGradient(0, 0, 0, 0, 0, w / 2)
    for (const [o, col] of stops) g.addColorStop(o, col)
    c.fillStyle = g
    c.fillRect(-w / 2, -w / 2, w, w)
    c.restore()
  }
  make('fx_shadow', 128, 64, (c) =>
    radial(
      c,
      128,
      64,
      [
        [0, 'rgba(20,10,0,0.75)'],
        [0.6, 'rgba(20,10,0,0.4)'],
        [1, 'rgba(20,10,0,0)'],
      ],
      0.5,
    ),
  )
  make('fx_glow', 64, 64, (c) =>
    radial(c, 64, 64, [
      [0, 'rgba(255,255,255,1)'],
      [0.35, 'rgba(255,255,255,0.55)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
  )
  make('fx_smoke', 64, 64, (c) => {
    for (let i = 0; i < 5; i++) {
      const x = 32 + Math.cos(i * 1.9) * 9
      const y = 32 + Math.sin(i * 1.9) * 9
      const g = c.createRadialGradient(x, y, 0, x, y, 20)
      g.addColorStop(0, 'rgba(255,255,255,0.55)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      c.fillStyle = g
      c.fillRect(0, 0, 64, 64)
    }
  })
  make('fx_ring', 128, 128, (c) => {
    c.strokeStyle = 'rgba(255,255,255,0.9)'
    c.lineWidth = 6
    c.filter = 'blur(2px)'
    c.beginPath()
    c.arc(64, 64, 54, 0, Math.PI * 2)
    c.stroke()
  })
  make('fx_scorch', 128, 64, (c) => {
    radial(
      c,
      128,
      64,
      [
        [0, 'rgba(10,6,2,0.85)'],
        [0.5, 'rgba(25,15,5,0.55)'],
        [1, 'rgba(25,15,5,0)'],
      ],
      0.5,
    )
    // лучи разлёта
    c.strokeStyle = 'rgba(20,12,4,0.35)'
    c.lineWidth = 2
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7 + 0.3
      c.beginPath()
      c.moveTo(64, 32)
      c.lineTo(64 + Math.cos(a) * 56, 32 + Math.sin(a) * 26)
      c.stroke()
    }
  })
  make('fx_vignette', 256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 90, 128, 128, 185)
    g.addColorStop(0, 'rgba(10,6,0,0)')
    g.addColorStop(1, 'rgba(10,6,0,0.55)')
    c.fillStyle = g
    c.fillRect(0, 0, 256, 256)
  })
}

interface Particle {
  img: Phaser.GameObjects.Image
  active: boolean
  age: number
  life: number
  vx: number
  vy: number
  s0: number
  s1: number
  a0: number
  a1: number
}

export interface Fx {
  /** клубок дыма: x, y — экранные координаты мира */
  smoke(x: number, y: number, scale?: number, depth?: number): void
  /** вспышка (свечение), additive */
  flash(x: number, y: number, color: number, scale: number, depth?: number): void
  /** расширяющееся кольцо ударной волны на земле */
  ring(x: number, y: number, scale: number, color: number, depth?: number): void
  /** опалённая земля, долго угасает */
  scorch(x: number, y: number, scale: number): void
  update(dtMs: number): void
}

const POOL = { smoke: 90, flash: 50, ring: 24, scorch: 40 }

function makePool(scene: Phaser.Scene, key: string, size: number, add: boolean, depth: number) {
  const items: Particle[] = []
  for (let i = 0; i < size; i++) {
    const img = scene.add.image(0, 0, key).setVisible(false).setDepth(depth)
    if (add) img.setBlendMode('ADD')
    items.push({ img, active: false, age: 0, life: 1, vx: 0, vy: 0, s0: 1, s1: 1, a0: 1, a1: 0 })
  }
  let cursor = 0
  return {
    items,
    // свободная частица, а если все заняты — самая давняя по кругу
    take(): Particle {
      for (let n = 0; n < items.length; n++) {
        const p = items[(cursor + n) % items.length]!
        if (!p.active) {
          cursor = (cursor + n + 1) % items.length
          return p
        }
      }
      const p = items[cursor]!
      cursor = (cursor + 1) % items.length
      return p
    },
  }
}

const registry = new WeakMap<Phaser.Scene, Fx>()

/** Эффекты сцены: пулы создаются лениво, вызывать update() каждый кадр */
export function fxOf(scene: Phaser.Scene): Fx {
  let fx = registry.get(scene)
  if (fx) return fx
  ensureFxTextures(scene)
  const smoke = makePool(scene, 'fx_smoke', POOL.smoke, false, 0)
  const flash = makePool(scene, 'fx_glow', POOL.flash, true, 0)
  const ring = makePool(scene, 'fx_ring', POOL.ring, true, 0)
  const scorch = makePool(scene, 'fx_scorch', POOL.scorch, false, -3e5)
  const all = [smoke.items, flash.items, ring.items, scorch.items]

  const start = (p: Particle, x: number, y: number, o: Partial<Particle>, tint?: number) => {
    p.active = true
    p.age = 0
    p.vx = 0
    p.vy = 0
    Object.assign(p, o)
    p.img.setPosition(x, y).setVisible(true).setScale(p.s0).setAlpha(p.a0)
    if (tint === undefined) p.img.clearTint()
    else p.img.setTint(tint)
  }

  fx = {
    smoke(x, y, scale = 1, depth = y + 3000) {
      const p = smoke.take()
      p.img.setDepth(depth).setRotation(Math.random() * 6.28)
      start(
        p,
        x,
        y,
        {
          life: 900 + Math.random() * 500,
          vx: (Math.random() - 0.5) * 0.012,
          vy: -0.02 - Math.random() * 0.015,
          s0: 0.25 * scale,
          s1: 0.7 * scale,
          a0: 0.45,
          a1: 0,
        },
        0x6a6258,
      )
    },
    flash(x, y, color, scale, depth = y + 3100) {
      const p = flash.take()
      p.img.setDepth(depth)
      start(p, x, y, { life: 140, s0: 0.5 * scale, s1: 1.1 * scale, a0: 1, a1: 0 }, color)
    },
    ring(x, y, scale, color, depth = y + 1) {
      const p = ring.take()
      p.img.setDepth(depth).setScale(0.1)
      start(p, x, y, { life: 380, s0: 0.15 * scale, s1: 1.0 * scale, a0: 0.8, a1: 0 }, color)
      p.img.scaleY = p.s0 * 0.5
    },
    scorch(x, y, scale) {
      const p = scorch.take()
      start(p, x, y, { life: 6000, s0: scale * 0.6, s1: scale * 0.6, a0: 0.55, a1: 0 })
      p.img.setDepth(-3e5 + Math.random())
    },
    update(dt) {
      for (const pool of all)
        for (const p of pool) {
          if (!p.active) continue
          p.age += dt
          const k = p.age / p.life
          if (k >= 1) {
            p.active = false
            p.img.setVisible(false)
            continue
          }
          const s = p.s0 + (p.s1 - p.s0) * k
          p.img.x += p.vx * dt
          p.img.y += p.vy * dt
          // кольцо сплющено по вертикали (вид на землю в изометрии)
          const flat = pool === ring.items
          p.img.setScale(s, flat ? s * 0.5 : s)
          p.img.setAlpha(p.a0 + (p.a1 - p.a0) * k)
        }
    },
  }
  registry.set(scene, fx)
  scene.events.once('shutdown', () => registry.delete(scene))
  return fx
}

import type { LevelData } from '@/entities/level'
import { DEFAULT_ISO, cellToScreen, worldSize } from '@/shared/lib/iso'

/** Поля вокруг карты (фон за её пределами), px */
export const BAKE_PAD = 320
/** Высота плато в px (должна совпадать с elevationAtTile) */
export const HILL_HEIGHT = 16
/** Толщина «плиты» под картой, px */
const SLAB = 30

export interface Hill {
  x0: number
  x1: number
  y0: number
  y1: number
}

export interface BakeImages {
  sand: CanvasImageSource
  sandLight: CanvasImageSource
  sandDry: CanvasImageSource
  road: CanvasImageSource
  rock: CanvasImageSource
}

const key = (x: number, y: number) => `${x},${y}`

/** Детерминированный ГСЧ только для оформления (не симуляция) */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Ctx = CanvasRenderingContext2D

function newCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/**
 * Запекает весь рельеф в один холст: песок, дорога, площадки, декор, плато, освещение.
 * Рисуется один раз при создании сцены, в кадре это одна картинка.
 */
export function bakeTerrain(level: LevelData, img: BakeImages, hill: Hill): HTMLCanvasElement {
  const { width: W, height: H } = worldSize()
  const P = BAKE_PAD
  const cv = newCanvas(W + P * 2, H + P * 2 + HILL_HEIGHT)
  const ctx = cv.getContext('2d')!
  const rand = rng(1337)
  const OY = P + HILL_HEIGHT // сдвиг по y: запас сверху под плато
  const tx = (x: number, y: number) => ({ x: x + P, y: y + OY })

  const buildable = new Set(level.buildable.map((p) => key(p.x, p.y)))
  const road = roadCells(level.path)
  const inHill = (i: number, j: number) =>
    i >= hill.x0 && i <= hill.x1 && j >= hill.y0 && j <= hill.y1

  // ---------- фон за пределами карты ----------
  const bg = ctx.createRadialGradient(
    cv.width / 2,
    cv.height / 2,
    200,
    cv.width / 2,
    cv.height / 2,
    cv.width * 0.62,
  )
  bg.addColorStop(0, '#4a3b28')
  bg.addColorStop(0.55, '#2c2318')
  bg.addColorStop(1, '#100d09')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, cv.width, cv.height)
  // каменистая пустошь за краем: песок-сухарь, затемнённый
  ctx.save()
  ctx.globalAlpha = 0.28
  fillPattern(ctx, img.sandDry, 0.9, 0, 0, cv.width, cv.height)
  ctx.restore()

  // карта-ромб
  const top = tx(W / 2, 0)
  const right = tx(W, H / 2)
  const bottom = tx(W / 2, H)
  const left = tx(0, H / 2)

  // тень плиты на фоне
  ctx.save()
  ctx.filter = 'blur(18px)'
  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.beginPath()
  ctx.moveTo(top.x, top.y + SLAB * 0.6)
  ctx.lineTo(right.x + 10, right.y + SLAB + 6)
  ctx.lineTo(bottom.x, bottom.y + SLAB + 16)
  ctx.lineTo(left.x - 10, left.y + SLAB + 6)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // боковые грани плиты (скальный срез)
  sideFace(ctx, img.rock, [left, bottom], SLAB, 0.55, '#6a5a44')
  sideFace(ctx, img.rock, [bottom, right], SLAB, 0.8, '#3c3226')

  // ---------- поверхность карты ----------
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(top.x, top.y)
  ctx.lineTo(right.x, right.y)
  ctx.lineTo(bottom.x, bottom.y)
  ctx.lineTo(left.x, left.y)
  ctx.closePath()
  ctx.clip()

  // всё плоское рисуем в клеточных координатах: матрица клетка -> экран
  const cell = () => ctx.setTransform(32, 16, -32, 16, W / 2 + P, OY)
  const screen = () => ctx.setTransform(1, 0, 0, 1, 0, 0)
  const n = level.width

  cell()
  // базовый песок + 3 слоя пятен разной зернистости; текстуры бесшовные, привязаны к миру
  fillPatternCell(ctx, img.sand, 1 / 9, 0, 0, n, level.height)
  for (let i = 0; i < 46; i++) {
    const useLight = rand() < 0.55
    blob(
      ctx,
      useLight ? img.sandLight : img.sandDry,
      rand() * n,
      rand() * level.height,
      2 + rand() * 5,
      1.5 + rand() * 4,
      useLight ? 0.55 : 0.5,
      1 / 7,
      rand,
    )
  }
  // тёмные участки уплотнённой земли
  for (let i = 0; i < 14; i++) {
    blob(
      ctx,
      img.road,
      rand() * n,
      rand() * level.height,
      1.5 + rand() * 3,
      1 + rand() * 2.5,
      0.28,
      1 / 8,
      rand,
    )
  }

  // дюнные волны: тонкие светлые дуги
  ctx.lineCap = 'round'
  for (let i = 0; i < 70; i++) {
    const cx = rand() * n
    const cy = rand() * level.height
    const len = 0.8 + rand() * 1.8
    ctx.strokeStyle = `rgba(255,240,200,${0.07 + rand() * 0.07})`
    ctx.lineWidth = 0.05 + rand() * 0.05
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.quadraticCurveTo(
      cx + len / 2,
      cy + (rand() - 0.5) * 0.4,
      cx + len,
      cy + (rand() - 0.5) * 0.3,
    )
    ctx.stroke()
    ctx.strokeStyle = `rgba(90,60,20,${0.05 + rand() * 0.05})`
    ctx.beginPath()
    ctx.moveTo(cx, cy + 0.08)
    ctx.quadraticCurveTo(cx + len / 2, cy + 0.08, cx + len, cy + 0.1)
    ctx.stroke()
  }

  // ---------- дорога ----------
  const pts = level.path
  const pathStroke = (width: number, style: string | CanvasPattern, dx = 0, dy = 0) => {
    ctx.lineWidth = width
    ctx.strokeStyle = style
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x + dx, p.y + dy) : ctx.moveTo(p.x + dx, p.y + dy)))
    ctx.stroke()
  }
  // осыпь и тёмный край (колея насыпи)
  ctx.save()
  ctx.filter = 'blur(5px)'
  pathStroke(1.95, 'rgba(70,45,15,0.38)')
  ctx.restore()
  ctx.save()
  ctx.filter = 'blur(2px)'
  pathStroke(1.55, 'rgba(60,38,12,0.55)')
  ctx.restore()
  // полотно дороги
  const roadPat = ctx.createPattern(img.road, 'repeat')!
  roadPat.setTransform(new DOMMatrix().scale(1 / 8))
  pathStroke(1.32, roadPat)
  // осветляем центр и добавляем перепады
  pathStroke(1.0, 'rgba(70,45,20,0.18)')
  pathStroke(0.45, 'rgba(200,165,110,0.07)')
  // колеи: две параллельные тёмные полосы вдоль каждого сегмента
  ctx.lineCap = 'butt'
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!
    const b = pts[i]!
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const nx = -(b.y - a.y) / len
    const ny = (b.x - a.x) / len
    for (const side of [-1, 1]) {
      ctx.strokeStyle = 'rgba(45,28,10,0.2)'
      ctx.lineWidth = 0.14
      ctx.setLineDash([1.3, 0.35, 0.6, 0.5])
      ctx.beginPath()
      ctx.moveTo(a.x + nx * 0.27 * side, a.y + ny * 0.27 * side)
      ctx.lineTo(b.x + nx * 0.27 * side, b.y + ny * 0.27 * side)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,235,190,0.06)'
      ctx.lineWidth = 0.04
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(a.x + nx * 0.36 * side, a.y + ny * 0.36 * side)
      ctx.lineTo(b.x + nx * 0.36 * side, b.y + ny * 0.36 * side)
      ctx.stroke()
    }
  }
  ctx.setLineDash([])
  // камешки вдоль краёв дороги
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!
    const b = pts[i]!
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const nx = -(b.y - a.y) / len
    const ny = (b.x - a.x) / len
    const cnt = Math.floor(len * 9)
    for (let k = 0; k < cnt; k++) {
      const t = rand()
      const off = (rand() < 0.5 ? -1 : 1) * (0.62 + rand() * 0.35)
      const x = a.x + (b.x - a.x) * t + nx * off
      const y = a.y + (b.y - a.y) * t + ny * off
      ctx.fillStyle = `rgba(${90 + rand() * 60},${75 + rand() * 40},${55 + rand() * 30},0.8)`
      ctx.beginPath()
      ctx.ellipse(x, y, 0.035 + rand() * 0.05, 0.03 + rand() * 0.04, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ---------- площадки под башни ----------
  for (const p of level.buildable) {
    if (inHill(p.x, p.y)) continue
    pad(ctx, p.x, p.y, 0.43, img.road)
  }

  // ---------- кратеры (на свободных клетках) ----------
  const free = (i: number, j: number, margin = 1) => {
    for (let dj = -margin; dj <= margin; dj++)
      for (let di = -margin; di <= margin; di++) {
        const k = key(i + di, j + dj)
        if (road.has(k) || buildable.has(k)) return false
      }
    return (
      !inHill(i, j) &&
      !inHill(i - 1, j) &&
      !inHill(i, j - 1) &&
      !inHill(i + 1, j) &&
      !inHill(i, j + 1)
    )
  }
  const used = new Set<string>()
  const pickCells = (count: number, margin: number, tries = 600) => {
    const out: { x: number; y: number }[] = []
    for (let t = 0; t < tries && out.length < count; t++) {
      const i = Math.floor(rand() * n)
      const j = Math.floor(rand() * level.height)
      if (used.has(key(i, j)) || !free(i, j, margin)) continue
      if (i === level.hq.x && j === level.hq.y) continue
      used.add(key(i, j))
      out.push({ x: i + 0.2 + rand() * 0.6, y: j + 0.2 + rand() * 0.6 })
    }
    return out
  }
  for (const c of pickCells(7, 1)) crater(ctx, c.x, c.y, 0.45 + rand() * 0.45, rand)

  // ---------- следы вокруг дороги, обломки ----------
  // мелкая россыпь камней по всему полю
  for (let i = 0; i < 520; i++) {
    const x = rand() * n
    const y = rand() * level.height
    const k = key(Math.floor(x), Math.floor(y))
    if (road.has(k) || inHill(Math.floor(x), Math.floor(y))) continue
    const r = 0.025 + rand() * 0.045
    ctx.fillStyle = `rgba(${80 + rand() * 70},${66 + rand() * 50},${48 + rand() * 30},0.85)`
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.2, r, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // спавн: тёмная воронка с красным свечением и пунктиром
  spawnMark(ctx, level.spawn.x, level.spawn.y)
  // платформа штаба
  hqPad(ctx, level.hq.x, level.hq.y, img.rock)

  screen()

  // ---------- декор в экранных координатах (с тенями) ----------
  const decorSpot = (c: { x: number; y: number }) => {
    const s = cellToScreen(c)
    return tx(s.x, s.y)
  }
  for (const c of pickCells(26, 1)) rock(ctx, decorSpot(c), 0.6 + rand() * 1.1, rand, img.rock)
  for (const c of pickCells(18, 1)) shrub(ctx, decorSpot(c), 0.7 + rand() * 0.6, rand)
  for (const c of pickCells(5, 1)) crates(ctx, decorSpot(c), rand)
  for (const c of pickCells(4, 1)) sandbags(ctx, decorSpot(c), rand)
  for (const c of pickCells(3, 1)) barrels(ctx, decorSpot(c), rand)

  // ---------- плато с кручами ----------
  drawHill(ctx, hill, buildable, img, tx, rand)

  // ---------- освещение: тёплый свет сверху-слева, мягкая тень снизу-справа ----------
  const light = ctx.createLinearGradient(left.x, top.y, right.x, bottom.y)
  light.addColorStop(0, 'rgba(255,226,160,0.16)')
  light.addColorStop(0.5, 'rgba(255,240,200,0)')
  light.addColorStop(1, 'rgba(30,15,0,0.22)')
  ctx.fillStyle = light
  ctx.fillRect(0, 0, cv.width, cv.height)
  // затемнение к краям плиты (ambient occlusion)
  const ao = ctx.createRadialGradient(
    cv.width / 2,
    OY + H / 2,
    H * 0.55,
    cv.width / 2,
    OY + H / 2,
    W * 0.55,
  )
  ao.addColorStop(0, 'rgba(0,0,0,0)')
  ao.addColorStop(1, 'rgba(25,12,0,0.42)')
  ctx.fillStyle = ao
  ctx.fillRect(0, 0, cv.width, cv.height)
  ctx.restore()

  // светлая кромка верхних граней плиты
  ctx.strokeStyle = 'rgba(255,235,185,0.55)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(left.x, left.y)
  ctx.lineTo(top.x, top.y)
  ctx.lineTo(right.x, right.y)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(40,25,10,0.7)'
  ctx.beginPath()
  ctx.moveTo(left.x, left.y)
  ctx.lineTo(bottom.x, bottom.y)
  ctx.lineTo(right.x, right.y)
  ctx.stroke()

  return cv
}

/** Смещение холста относительно мира: левый верхний угол в мировых координатах */
export const BAKE_ORIGIN = { x: -BAKE_PAD, y: -(BAKE_PAD + HILL_HEIGHT) }

// ---------------------------------------------------------------- хелперы

function roadCells(path: readonly { x: number; y: number }[]): Set<string> {
  const out = new Set<string>()
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!
    const b = path[i]!
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4))
    for (let s = 0; s <= n; s++) {
      const x = a.x + ((b.x - a.x) * s) / n
      const y = a.y + ((b.y - a.y) * s) / n
      out.add(key(Math.floor(x), Math.floor(y)))
    }
  }
  return out
}

/** Заливка паттерном в экранных координатах */
function fillPattern(
  ctx: Ctx,
  src: CanvasImageSource,
  scale: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const p = ctx.createPattern(src, 'repeat')!
  p.setTransform(new DOMMatrix().scale(scale))
  ctx.fillStyle = p
  ctx.fillRect(x, y, w, h)
}

/** Заливка паттерном в клеточных координатах: текстура ложится «плашмя» на землю */
function fillPatternCell(
  ctx: Ctx,
  src: CanvasImageSource,
  scale: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const p = ctx.createPattern(src, 'repeat')!
  p.setTransform(new DOMMatrix().scale(scale))
  ctx.fillStyle = p
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2)
}

/** Мягкое пятно текстуры (клеточные координаты) */
function blob(
  ctx: Ctx,
  src: CanvasImageSource,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  alpha: number,
  scale: number,
  rand: () => number,
) {
  const size = 256
  const tmp = newCanvas(size, size)
  const t = tmp.getContext('2d')!
  const g = t.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, `rgba(0,0,0,${alpha})`)
  g.addColorStop(0.6, `rgba(0,0,0,${alpha * 0.55})`)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  t.fillStyle = g
  t.fillRect(0, 0, size, size)
  t.globalCompositeOperation = 'source-in'
  const p = t.createPattern(src, 'repeat')!
  p.setTransform(new DOMMatrix().translate(rand() * 256, rand() * 256).scale(1.2))
  t.fillStyle = p
  t.fillRect(0, 0, size, size)
  void scale
  ctx.drawImage(tmp, cx - rx, cy - ry, rx * 2, ry * 2)
}

function sideFace(
  ctx: Ctx,
  rock: CanvasImageSource,
  edge: [{ x: number; y: number }, { x: number; y: number }],
  h: number,
  shade: number,
  base: string,
) {
  const [a, b] = edge
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.lineTo(b.x, b.y + h)
  ctx.lineTo(a.x, a.y + h)
  ctx.closePath()
  ctx.fillStyle = base
  ctx.fill()
  ctx.clip()
  ctx.globalAlpha = 0.9
  fillPattern(ctx, rock, 0.7, 0, 0, 4000, 4000)
  ctx.globalAlpha = 1
  const g = ctx.createLinearGradient(0, a.y, 0, Math.max(a.y, b.y) + h)
  g.addColorStop(0, `rgba(0,0,0,${0.15 * shade})`)
  g.addColorStop(1, `rgba(0,0,0,${0.75 * shade + 0.1})`)
  ctx.fillStyle = g
  ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x) + 2, 200 + h)
  ctx.restore()
}

/** Бетонно-гравийная площадка под башню (в клеточных координатах) */
function pad(ctx: Ctx, i: number, j: number, r: number, tex: CanvasImageSource) {
  const cx = i + 0.5
  const cy = j + 0.5
  ctx.save()
  ctx.beginPath()
  roundRect(ctx, cx - r, cy - r, r * 2, r * 2, 0.1)
  ctx.clip()
  const p = ctx.createPattern(tex, 'repeat')!
  p.setTransform(new DOMMatrix().scale(1 / 10))
  ctx.fillStyle = p
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  ctx.fillStyle = 'rgba(30,20,10,0.35)'
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  ctx.restore()
  ctx.strokeStyle = 'rgba(25,15,5,0.55)'
  ctx.lineWidth = 0.05
  ctx.beginPath()
  roundRect(ctx, cx - r, cy - r, r * 2, r * 2, 0.1)
  ctx.stroke()
  // блик на верхних гранях, тень на нижних
  ctx.strokeStyle = 'rgba(255,235,190,0.35)'
  ctx.lineWidth = 0.035
  ctx.beginPath()
  ctx.moveTo(cx - r + 0.03, cy + r - 0.03)
  ctx.lineTo(cx - r + 0.03, cy - r + 0.03)
  ctx.lineTo(cx + r - 0.03, cy - r + 0.03)
  ctx.stroke()
  // угловые метки
  ctx.fillStyle = 'rgba(220,190,110,0.55)'
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const) {
    ctx.fillRect(cx + sx * (r - 0.1) - 0.03, cy + sy * (r - 0.1) - 0.03, 0.06, 0.06)
  }
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function crater(ctx: Ctx, x: number, y: number, r: number, rand: () => number) {
  ctx.save()
  ctx.filter = 'blur(3px)'
  ctx.fillStyle = 'rgba(40,25,8,0.35)'
  ctx.beginPath()
  ctx.ellipse(x, y, r * 1.5, r * 1.4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r)
  g.addColorStop(0, 'rgba(25,15,5,0.85)')
  g.addColorStop(0.7, 'rgba(60,40,15,0.65)')
  g.addColorStop(1, 'rgba(90,65,30,0.2)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(x, y, r, r * 0.95, 0, 0, Math.PI * 2)
  ctx.fill()
  // светлый вал по верхне-левому краю и тёмный по нижне-правому
  ctx.lineWidth = r * 0.12
  ctx.strokeStyle = 'rgba(255,230,170,0.35)'
  ctx.beginPath()
  ctx.arc(x, y, r * 1.02, Math.PI * 0.95, Math.PI * 1.65)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(30,15,0,0.35)'
  ctx.beginPath()
  ctx.arc(x, y, r * 1.02, -Math.PI * 0.05, Math.PI * 0.65)
  ctx.stroke()
  // выбросы
  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2
    const d = r * (1.15 + rand() * 0.7)
    ctx.fillStyle = 'rgba(50,35,15,0.5)'
    ctx.beginPath()
    ctx.ellipse(
      x + Math.cos(a) * d,
      y + Math.sin(a) * d,
      0.03 + rand() * 0.04,
      0.025 + rand() * 0.03,
      0,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
}

function spawnMark(ctx: Ctx, i: number, j: number) {
  const x = i
  const y = j
  const g = ctx.createRadialGradient(x, y, 0.1, x, y, 1.6)
  g.addColorStop(0, 'rgba(255,60,40,0.55)')
  g.addColorStop(0.5, 'rgba(160,30,20,0.3)')
  g.addColorStop(1, 'rgba(160,30,20,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, 1.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.setLineDash([0.18, 0.14])
  ctx.lineWidth = 0.07
  ctx.strokeStyle = 'rgba(255,90,70,0.85)'
  ctx.beginPath()
  ctx.arc(x, y, 0.8, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.strokeStyle = 'rgba(255,200,180,0.5)'
  ctx.lineWidth = 0.03
  ctx.beginPath()
  ctx.arc(x, y, 0.55, 0, Math.PI * 2)
  ctx.stroke()
}

function hqPad(ctx: Ctx, i: number, j: number, tex: CanvasImageSource) {
  const r = 1.15
  ctx.save()
  ctx.filter = 'blur(4px)'
  ctx.fillStyle = 'rgba(30,18,6,0.45)'
  ctx.beginPath()
  roundRect(ctx, i - r - 0.1, j - r - 0.1, r * 2 + 0.3, r * 2 + 0.3, 0.2)
  ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.beginPath()
  roundRect(ctx, i - r, j - r, r * 2, r * 2, 0.15)
  ctx.clip()
  const p = ctx.createPattern(tex, 'repeat')!
  p.setTransform(new DOMMatrix().scale(1 / 9))
  ctx.fillStyle = p
  ctx.fillRect(i - r, j - r, r * 2, r * 2)
  ctx.fillStyle = 'rgba(70,75,80,0.55)'
  ctx.fillRect(i - r, j - r, r * 2, r * 2)
  ctx.restore()
  ctx.strokeStyle = 'rgba(240,210,120,0.8)'
  ctx.setLineDash([0.22, 0.16])
  ctx.lineWidth = 0.05
  ctx.beginPath()
  roundRect(ctx, i - r + 0.12, j - r + 0.12, r * 2 - 0.24, r * 2 - 0.24, 0.1)
  ctx.stroke()
  ctx.setLineDash([])
}

type P2 = { x: number; y: number }

function shadowEllipse(ctx: Ctx, p: P2, rx: number, ry: number, a = 0.35) {
  ctx.save()
  ctx.filter = 'blur(3px)'
  ctx.fillStyle = `rgba(30,15,0,${a})`
  ctx.beginPath()
  ctx.ellipse(p.x + rx * 0.35, p.y + ry * 0.25, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Валун: многогранный камень с тенью, текстурой скалы и бликом сверху-слева */
function rock(ctx: Ctx, p: P2, s: number, rand: () => number, tex: CanvasImageSource) {
  const r = 11 * s
  shadowEllipse(ctx, p, r * 1.3, r * 0.55, 0.4)
  const n = 7
  const pts: P2[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.5
    const d = r * (0.75 + rand() * 0.35)
    pts.push({ x: p.x + Math.cos(a) * d * 1.15, y: p.y - r * 0.55 + Math.sin(a) * d * 0.8 })
  }
  ctx.save()
  ctx.beginPath()
  pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)))
  ctx.closePath()
  ctx.clip()
  const g = ctx.createLinearGradient(p.x - r, p.y - r * 1.4, p.x + r, p.y + r * 0.2)
  g.addColorStop(0, '#b8a58a')
  g.addColorStop(0.5, '#7d6c55')
  g.addColorStop(1, '#3f3426')
  ctx.fillStyle = g
  ctx.fillRect(p.x - r * 2, p.y - r * 2, r * 4, r * 3)
  ctx.globalAlpha = 0.45
  ctx.globalCompositeOperation = 'overlay'
  const pat = ctx.createPattern(tex, 'repeat')!
  pat.setTransform(new DOMMatrix().translate(rand() * 100, rand() * 100).scale(0.25))
  ctx.fillStyle = pat
  ctx.fillRect(p.x - r * 2, p.y - r * 2, r * 4, r * 3)
  ctx.restore()
  ctx.strokeStyle = 'rgba(25,15,5,0.7)'
  ctx.lineWidth = 1
  ctx.beginPath()
  pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)))
  ctx.closePath()
  ctx.stroke()
  // грань: тёмный скол справа
  ctx.fillStyle = 'rgba(20,10,0,0.28)'
  ctx.beginPath()
  ctx.moveTo(p.x + r * 0.1, p.y - r * 1.1)
  ctx.lineTo(pts[1]!.x, pts[1]!.y)
  ctx.lineTo(pts[2]!.x, pts[2]!.y)
  ctx.lineTo(p.x + r * 0.15, p.y - r * 0.1)
  ctx.closePath()
  ctx.fill()
  // блик
  ctx.strokeStyle = 'rgba(255,245,220,0.5)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(pts[4]!.x + 1, pts[4]!.y)
  ctx.lineTo(pts[5]!.x + 1, pts[5]!.y - 1)
  ctx.lineTo(pts[6]!.x + 2, pts[6]!.y - 1)
  ctx.stroke()
  // мелкие камни рядом
  for (let i = 0; i < 3; i++) {
    const q = { x: p.x + (rand() - 0.5) * r * 3, y: p.y + rand() * r * 0.8 }
    ctx.fillStyle = '#6d5e48'
    ctx.beginPath()
    ctx.ellipse(q.x, q.y, 2 + rand() * 2, 1.5 + rand(), 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Сухой куст: пучки колючих веточек */
function shrub(ctx: Ctx, p: P2, s: number, rand: () => number) {
  shadowEllipse(ctx, p, 12 * s, 5 * s, 0.3)
  const blades = 26
  for (let i = 0; i < blades; i++) {
    const a = -Math.PI / 2 + (rand() - 0.5) * 2.4
    const l = (6 + rand() * 9) * s
    const x = p.x + (rand() - 0.5) * 8 * s
    const y = p.y - 1
    const green = rand() < 0.45
    ctx.strokeStyle = green
      ? `rgb(${95 + rand() * 40},${105 + rand() * 40},${55 + rand() * 20})`
      : `rgb(${150 + rand() * 50},${120 + rand() * 40},${70 + rand() * 20})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(
      x + Math.cos(a) * l * 0.5,
      y + Math.sin(a) * l * 0.6,
      x + Math.cos(a) * l,
      y + Math.sin(a) * l,
    )
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(60,45,20,0.6)'
  ctx.beginPath()
  ctx.ellipse(p.x, p.y, 3 * s, 1.5 * s, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** Изометрический ящик (куб) вокруг точки */
function isoBox(ctx: Ctx, p: P2, w: number, h: number, top: string, left: string, right: string) {
  const hw = w
  const hh = w / 2
  ctx.fillStyle = left
  ctx.beginPath()
  ctx.moveTo(p.x - hw, p.y)
  ctx.lineTo(p.x, p.y + hh)
  ctx.lineTo(p.x, p.y + hh - h)
  ctx.lineTo(p.x - hw, p.y - h)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = right
  ctx.beginPath()
  ctx.moveTo(p.x + hw, p.y)
  ctx.lineTo(p.x, p.y + hh)
  ctx.lineTo(p.x, p.y + hh - h)
  ctx.lineTo(p.x + hw, p.y - h)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = top
  ctx.beginPath()
  ctx.moveTo(p.x, p.y - hh - h)
  ctx.lineTo(p.x + hw, p.y - h)
  ctx.lineTo(p.x, p.y + hh - h)
  ctx.lineTo(p.x - hw, p.y - h)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'
  ctx.lineWidth = 0.8
  ctx.stroke()
}

function crates(ctx: Ctx, p: P2, rand: () => number) {
  shadowEllipse(ctx, p, 28, 11, 0.4)
  const stack: [number, number, number][] = [
    [-9, 0, 0],
    [9, 2, 0],
    [0, -3, 11],
  ]
  for (const [dx, dy, dz] of stack) {
    const q = { x: p.x + dx, y: p.y + dy - dz }
    isoBox(ctx, q, 10, 11, '#9c7a45', '#6c522c', '#53401f')
    // доски
    ctx.strokeStyle = 'rgba(40,25,8,0.55)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(q.x - 10, q.y - 5)
    ctx.lineTo(q.x, q.y)
    ctx.moveTo(q.x + 10, q.y - 5)
    ctx.lineTo(q.x, q.y)
    ctx.stroke()
  }
  void rand
}

function sandbags(ctx: Ctx, p: P2, rand: () => number) {
  shadowEllipse(ctx, p, 26, 8, 0.35)
  for (let row = 0; row < 2; row++) {
    const n = 5 - row
    for (let i = 0; i < n; i++) {
      const x = p.x + (i - (n - 1) / 2) * 9 + (rand() - 0.5)
      const y = p.y - row * 5 + (i - (n - 1) / 2) * 3.5
      const g = ctx.createLinearGradient(x, y - 6, x, y + 3)
      g.addColorStop(0, '#d6c08e')
      g.addColorStop(1, '#8e7b52')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(x, y - 2, 6.2, 3.8, -0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(50,35,10,0.6)'
      ctx.lineWidth = 0.8
      ctx.stroke()
    }
  }
}

function barrels(ctx: Ctx, p: P2, rand: () => number) {
  shadowEllipse(ctx, p, 18, 7, 0.4)
  for (let i = 0; i < 3; i++) {
    const x = p.x + (i - 1) * 9 + (rand() - 0.5) * 2
    const y = p.y + (i === 1 ? -3 : 1)
    const body = i === 1 ? '#a8432e' : '#566b3a'
    const dark = i === 1 ? '#6b2518' : '#33431f'
    ctx.fillStyle = dark
    ctx.beginPath()
    ctx.ellipse(x, y, 5, 2.6, 0, 0, Math.PI)
    ctx.lineTo(x - 5, y - 10)
    ctx.lineTo(x + 5, y - 10)
    ctx.closePath()
    ctx.fill()
    const g = ctx.createLinearGradient(x - 5, 0, x + 5, 0)
    g.addColorStop(0, 'rgba(255,255,255,0.25)')
    g.addColorStop(0.5, 'rgba(255,255,255,0)')
    g.addColorStop(1, 'rgba(0,0,0,0.3)')
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.rect(x - 5, y - 10, 10, 10)
    ctx.fill()
    ctx.fillStyle = g
    ctx.fillRect(x - 5, y - 10, 10, 10)
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.ellipse(x, y - 10, 5, 2.6, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.lineWidth = 0.8
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x - 5, y - 6)
    ctx.quadraticCurveTo(x, y - 3.4, x + 5, y - 6)
    ctx.stroke()
  }
}

/** Плато: тень, скальные стены с текстурой, песчаная верхняя грань, осыпь у подножия */
function drawHill(
  ctx: Ctx,
  hill: Hill,
  buildable: Set<string>,
  img: BakeImages,
  tx: (x: number, y: number) => P2,
  rand: () => number,
) {
  const h = HILL_HEIGHT
  const corner = (i: number, j: number) => {
    const s = cellToScreen({ x: i, y: j })
    return tx(s.x, s.y)
  }
  const { x0, x1, y0, y1 } = hill
  const T = corner(x0, y0)
  const R = corner(x1 + 1, y0)
  const B = corner(x1 + 1, y1 + 1)
  const L = corner(x0, y1 + 1)
  void DEFAULT_ISO

  // мягкая тень плато (свет сверху-слева -> тень вправо-вниз)
  ctx.save()
  ctx.filter = 'blur(10px)'
  ctx.fillStyle = 'rgba(25,12,0,0.5)'
  ctx.beginPath()
  ctx.moveTo(L.x, L.y)
  ctx.lineTo(B.x, B.y + 3)
  ctx.lineTo(R.x + 16, R.y + 10)
  ctx.lineTo(R.x + 22, R.y + 18)
  ctx.lineTo(B.x + 12, B.y + 16)
  ctx.lineTo(L.x - 4, L.y + 8)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // осыпь песка у подножия: светлые пятна на земле вдоль кромки
  ctx.save()
  ctx.filter = 'blur(6px)'
  ctx.fillStyle = 'rgba(205,175,125,0.55)'
  for (let t = 0; t <= 1; t += 0.06) {
    ctx.beginPath()
    ctx.ellipse(L.x + (B.x - L.x) * t - 4, L.y + (B.y - L.y) * t + 4, 12, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(B.x + (R.x - B.x) * t + 4, B.y + (R.y - B.y) * t + 4, 12, 5, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // левая и правая стены (с лёгким уклоном-осыпью)
  const wall = (a: P2, b: P2, shade: number, base: string) => {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(a.x, a.y - h)
    ctx.lineTo(b.x, b.y - h)
    ctx.lineTo(b.x, b.y)
    ctx.lineTo(a.x, a.y)
    ctx.closePath()
    ctx.fillStyle = base
    ctx.fill()
    ctx.clip()
    ctx.globalAlpha = 0.85
    fillPattern(ctx, img.rock, 0.5, 0, 0, 4000, 4000)
    ctx.globalAlpha = 1
    const g = ctx.createLinearGradient(0, Math.min(a.y, b.y) - h, 0, Math.max(a.y, b.y))
    g.addColorStop(0, `rgba(255,230,170,${0.35 * (1 - shade)})`)
    g.addColorStop(0.5, `rgba(0,0,0,${0.12 * shade})`)
    g.addColorStop(1, `rgba(0,0,0,${0.55 * shade})`)
    ctx.fillStyle = g
    ctx.fillRect(
      a.x - 2,
      Math.min(a.y, b.y) - h - 2,
      Math.abs(b.x - a.x) + 4,
      Math.abs(b.y - a.y) + h + 6,
    )
    // вертикальные трещины
    ctx.strokeStyle = 'rgba(20,10,0,0.3)'
    ctx.lineWidth = 1
    const segs = Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 18)
    for (let k = 1; k < segs; k++) {
      const t = k / segs + (rand() - 0.5) * 0.05
      const x = a.x + (b.x - a.x) * t
      const y = a.y + (b.y - a.y) * t
      ctx.beginPath()
      ctx.moveTo(x, y - h)
      ctx.lineTo(x + (rand() - 0.5) * 3, y - h * (0.3 + rand() * 0.4))
      ctx.stroke()
    }
    ctx.restore()
  }
  wall(L, B, 0.45, '#8a7552')
  wall(B, R, 1.0, '#5a4930')

  // верхняя грань
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(T.x, T.y - h)
  ctx.lineTo(R.x, R.y - h)
  ctx.lineTo(B.x, B.y - h)
  ctx.lineTo(L.x, L.y - h)
  ctx.closePath()
  ctx.clip()
  // та же ортографическая проекция «плашмя», что и у земли
  ctx.setTransform(32, 16, -32, 16, 24 * 32 + BAKE_PAD, BAKE_PAD + HILL_HEIGHT - h)
  fillPatternCell(
    ctx,
    img.sand,
    1 / 9,
    hill.x0,
    hill.y0,
    hill.x1 - hill.x0 + 1,
    hill.y1 - hill.y0 + 1,
  )
  fillPatternCell(
    ctx,
    img.sandLight,
    1 / 7,
    hill.x0,
    hill.y0,
    hill.x1 - hill.x0 + 1,
    hill.y1 - hill.y0 + 1,
  )
  ctx.globalAlpha = 0.5
  ctx.fillStyle = 'rgba(240,215,160,0.0)'
  ctx.globalAlpha = 1
  for (const p of buildable) {
    const [bx, by] = p.split(',').map(Number) as [number, number]
    if (bx >= hill.x0 && bx <= hill.x1 && by >= hill.y0 && by <= hill.y1)
      pad(ctx, bx, by, 0.43, img.road)
  }
  ctx.restore()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  // кромка
  ctx.strokeStyle = 'rgba(255,238,190,0.6)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(L.x, L.y - h)
  ctx.lineTo(T.x, T.y - h)
  ctx.lineTo(R.x, R.y - h)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(40,25,10,0.6)'
  ctx.beginPath()
  ctx.moveTo(L.x, L.y - h)
  ctx.lineTo(B.x, B.y - h)
  ctx.lineTo(R.x, R.y - h)
  ctx.stroke()
  // валуны по кромке
  rock(ctx, { x: L.x + 18, y: L.y - h - 4 }, 0.55, rand, img.rock)
  rock(ctx, { x: T.x + 12, y: T.y - h + 22 }, 0.5, rand, img.rock)
}

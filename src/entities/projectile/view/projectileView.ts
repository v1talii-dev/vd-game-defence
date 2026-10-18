import type Phaser from 'phaser'
import { fxOf } from '@/shared/lib/fx'
import {
  cellToScreen,
  depthOf,
  radiusToScreen,
  interpolated,
  trackPosition,
  type Tracked,
} from '@/shared/lib/iso'
import type { ProjectileState } from '../model/projectile'

const FLY_HEIGHT = 14
const FX_MS = 220

interface Fx {
  g: Phaser.GameObjects.Graphics
  age: number
  // радиус сплэша в клетках, 0 — обычная вспышка
  splash: number
  active: boolean
}

function drawProjectile(g: Phaser.GameObjects.Graphics, damageType: string, splash: number) {
  g.clear()
  switch (damageType) {
    case 'rocket':
      g.fillStyle(0xff9a3c, 1)
      g.fillRect(-6, -2, 12, 4)
      g.fillStyle(0xffffff, 1)
      g.fillRect(4, -2, 3, 4)
      break
    case 'antiAir':
      g.fillStyle(0x6fe0ff, 1)
      g.fillRect(-5, -1.5, 10, 3)
      break
    default:
      g.fillStyle(splash > 0 ? 0x333333 : 0xffee77, 1)
      g.fillCircle(0, 0, splash > 0 ? 5 : 2.5)
  }
}

/** Снаряды и эффекты попаданий: объекты берутся из пулов и возвращаются в них */
export function createProjectileLayer(scene: Phaser.Scene) {
  const tracked = new Map<
    number,
    {
      g: Phaser.GameObjects.Graphics
      pos: Tracked
      tx: number
      ty: number
      splash: number
      kind: string
      n: number
      gen: number
    }
  >()
  let gen = 0
  const freeProj: Phaser.GameObjects.Graphics[] = []
  const fxPool: Fx[] = []

  const acquireProj = () => {
    const g = freeProj.pop() ?? scene.add.graphics()
    g.setVisible(true)
    return g
  }

  function spawnFx(x: number, y: number, splash: number) {
    let fx = fxPool.find((f) => !f.active)
    if (!fx) {
      fx = { g: scene.add.graphics(), age: 0, splash: 0, active: false }
      fxPool.push(fx)
    }
    const p = cellToScreen({ x, y })
    const e = fxOf(scene)
    if (splash > 0) {
      e.flash(p.x, p.y - 8, 0xffa040, 1.5 + splash)
      e.ring(p.x, p.y, 0.9 + splash * 0.8, 0xffc070)
      e.smoke(p.x, p.y - 10, 1.2 + splash * 0.4)
      e.scorch(p.x, p.y, 0.45 + splash * 0.35)
    } else {
      e.flash(p.x, p.y - FLY_HEIGHT / 2, 0xfff0b0, 0.6)
    }
    fx.g.setPosition(p.x, p.y)
    fx.g.setDepth(depthOf({ x, y }) + 1)
    fx.g.setVisible(true)
    fx.age = 0
    fx.splash = splash
    fx.active = true
  }

  function drawFx(fx: Fx) {
    const k = fx.age / FX_MS
    const g = fx.g
    g.clear()
    if (fx.splash > 0) {
      // круг в клетках превращается в эллипс на экране
      const { rx, ry } = radiusToScreen(fx.splash * (0.4 + 0.6 * k))
      g.fillStyle(0xff8c2e, 0.45 * (1 - k))
      g.fillEllipse(0, 0, rx * 2, ry * 2)
      g.lineStyle(2, 0xffd080, 1 - k)
      g.strokeEllipse(0, 0, rx * 2, ry * 2)
    } else {
      g.fillStyle(0xfff2a0, 1 - k)
      g.fillCircle(0, -FLY_HEIGHT / 2, 4 + 6 * k)
    }
  }

  return {
    sync(projectiles: readonly ProjectileState[], tick: number, alpha: number) {
      gen++
      for (const pr of projectiles) {
        let it = tracked.get(pr.id)
        if (!it) {
          const g = acquireProj()
          drawProjectile(g, pr.damageType, pr.splash)
          it = {
            g,
            pos: trackPosition(undefined, pr.x, pr.y, tick),
            tx: pr.tx,
            ty: pr.ty,
            splash: pr.splash,
            kind: pr.damageType,
            n: 0,
            gen,
          }
          tracked.set(pr.id, it)
        }
        it.gen = gen
        trackPosition(it.pos, pr.x, pr.y, tick)
        it.tx = pr.tx
        it.ty = pr.ty
        const p = interpolated(it.pos, alpha)
        const s = cellToScreen(p)
        it.g.setPosition(s.x, s.y - FLY_HEIGHT)
        it.g.setDepth(depthOf(p) + 500)
        // дымный след у ракет и снарядов миномёта
        if ((it.kind === 'rocket' || it.splash > 0) && ++it.n % 3 === 0)
          fxOf(scene).smoke(s.x, s.y - FLY_HEIGHT, it.kind === 'rocket' ? 0.5 : 0.35, s.y + 400)
        if (it.kind === 'rocket' || it.kind === 'antiAir') {
          const t = cellToScreen({ x: pr.tx, y: pr.ty })
          it.g.setRotation(Math.atan2(t.y - s.y, t.x - s.x))
        }
      }
      for (const [id, it] of tracked) {
        if (it.gen === gen) continue
        // исчез из состояния — значит долетел: эффект в точке назначения
        spawnFx(it.tx, it.ty, it.splash)
        it.g.setVisible(false).setRotation(0)
        freeProj.push(it.g)
        tracked.delete(id)
      }
    },
    update(dtMs: number) {
      for (const fx of fxPool) {
        if (!fx.active) continue
        fx.age += dtMs
        if (fx.age >= FX_MS) {
          fx.active = false
          fx.g.setVisible(false)
        } else drawFx(fx)
      }
    },
    clear() {
      for (const it of tracked.values()) {
        it.g.setVisible(false)
        freeProj.push(it.g)
      }
      tracked.clear()
      for (const fx of fxPool) {
        fx.active = false
        fx.g.setVisible(false)
      }
    },
  }
}

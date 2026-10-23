// Three.js-рендер боя (SPEC §3.5). Только читает состояние симуляции.
import {
  AmbientLight,
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  DirectionalLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { useBattleSession } from '@/entities/battle'
import { ENEMIES, type EnemyState } from '@/entities/enemy'
import type { LevelData } from '@/entities/level'
import { projectilePosition, type ProjectileState } from '@/entities/projectile'
import { TOWERS, towerStats } from '@/entities/tower'
import { createCameraRig, loadGlbParts } from '@/shared/lib/three'
import { stressSetup } from './stress'
import { createDebug3d } from './three/debug3d'
import { createEffects } from './three/effects'
import { BUILD_COLOR, UPGRADE_COLOR, createHud } from './three/hud'
import { attachInput3d } from './three/input3d'
import { createModels, PAD_H } from './three/models'
import { DECO_GLB, ENEMY_GLB, TOWER_GLB } from './three/modelConfig'
import { buildWorld } from './three/world'

const ENEMY_CAP = 256
const TRAIL_STEP = 0.18

interface EnemyRec {
  px: number
  py: number
  pz: number
  x: number
  y: number
  z: number
  yaw: number
  tick: number
  seen: number
}

interface ProjRec {
  missile: Mesh
  bullet: Mesh
  lx: number
  ly: number
  lz: number
  seen: number
}

function findEnemy(list: EnemyState[], id: number | null): EnemyState | undefined {
  for (const e of list) if (e.id === id) return e
  return undefined
}

export interface ThreeBattle {
  dispose(): void
  rig: ReturnType<typeof createCameraRig>
  canvas: HTMLCanvasElement
  /** отрисован хотя бы один кадр */
  ready(): boolean
  /** WebGL-ресурсы и draw calls (для отладки и замеров) */
  info(): { geometries: number; textures: number; calls: number; triangles: number }
}

export function createThreeBattle(
  host: HTMLElement,
  level: LevelData,
  opts: { stress?: boolean; onContextLost?: () => void; onContextRestored?: () => void } = {},
): ThreeBattle {
  const session = useBattleSession()
  const debugOn = new URLSearchParams(window.location.search).get('debug') === '1'
  const renderer = new WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x100d09)
  host.appendChild(renderer.domElement)
  const scene = new Scene()
  const rig = createCameraRig(1, level.width, level.height)
  scene.add(new AmbientLight(0xffffff, 0.8))
  const sun = new DirectionalLight(0xffffff, 1.2)
  sun.position.set(-5, 10, 3)
  scene.add(sun)

  // всё, что создаётся один раз, освобождаем при выходе
  const disposables: { dispose(): void }[] = [renderer]
  const track = <T extends { dispose(): void }>(x: T): T => (disposables.push(x), x)

  const world = buildWorld(scene, level, disposables)
  const models = createModels(scene, disposables)
  // GLB подгружаются лениво; при ошибке остаются примитивы
  let alive = true
  const glbFiles = [
    ...Object.values(TOWER_GLB),
    ...Object.values(ENEMY_GLB),
    ...Object.values(DECO_GLB),
  ]
  void loadGlbParts(
    `${import.meta.env.BASE_URL}assets/models/`,
    glbFiles.map((m) => m.file),
  ).then((loaded) => {
    if (!alive) return
    models.applyGlbs(loaded)
    world.applyGlbs(loaded)
  })
  const hud = createHud(scene, rig.camera, disposables)
  const fx = createEffects(scene, disposables)
  const buildable = new Set(level.buildable.map((c) => `${c.x},${c.y}`))
  const input = attachInput3d(renderer.domElement, rig, session, buildable)
  // ghost-превью постройки: подсветка клетки (зелёная/красная) и модель башни
  const ghostGeo = track(new PlaneGeometry(0.94, 0.94).rotateX(-Math.PI / 2))
  const ghostMat = track(
    new MeshBasicMaterial({ transparent: true, opacity: 0.5, depthWrite: false }),
  )
  const ghostTile = new Mesh(ghostGeo, ghostMat)
  ghostTile.visible = false
  scene.add(ghostTile)
  const dbg = debugOn ? createDebug3d(host, scene, renderer, disposables) : null

  // тени врагов — один InstancedMesh
  const shadowGeo = track(new CircleGeometry(0.5, 16).rotateX(-Math.PI / 2))
  const shadowMat = track(
    new MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.4, depthWrite: false }),
  )
  const enemyShadows = track(new InstancedMesh(shadowGeo, shadowMat, ENEMY_CAP))
  enemyShadows.frustumCulled = false
  scene.add(enemyShadows)

  const missileGeo = track(new ConeGeometry(0.08, 0.35, 8).rotateX(Math.PI / 2))
  const bulletGeo = track(new BoxGeometry(0.03, 0.03, 0.28))
  const missileMat = track(new MeshBasicMaterial({ color: 0xffffff }))
  const bulletMat = track(new MeshBasicMaterial({ color: 0xffe08a }))

  const enemies = new Map<number, EnemyRec>()
  const towerAim = new Map<number, { yaw: number; seen: number }>()
  const projs = new Map<number, ProjRec>()
  const projPool: ProjRec[] = []
  let frameNo = 0
  let rendered = false

  const _m = new Matrix4()
  const _q = new Quaternion()
  const _p = new Vector3()
  const _s = new Vector3()

  function newProj(): ProjRec {
    const missile = new Mesh(missileGeo, missileMat)
    const bullet = new Mesh(bulletGeo, bulletMat)
    scene.add(missile, bullet)
    return { missile, bullet, lx: 0, ly: 0, lz: 0, seen: 0 }
  }

  function syncProjectile(p: ProjectileState, alpha: number) {
    let r = projs.get(p.id)
    if (!r) {
      r = projPool.pop() ?? newProj()
      r.missile.visible = p.kind === 'rocket'
      r.bullet.visible = p.kind === 'bullet'
      r.lx = p.fromX
      r.ly = p.fromY
      r.lz = p.fromZ
      projs.set(p.id, r)
    }
    r.seen = frameNo
    // между тиками: t предыдущего тика + alpha * dt
    const t = Math.min(1, Math.max(0, p.t - p.dt * (1 - alpha)))
    const q = projectilePosition(p, t)
    const q2 = projectilePosition(p, Math.min(1, t + 0.02))
    const body = p.kind === 'rocket' ? r.missile : r.bullet
    body.position.set(q.x, q.z, q.y)
    body.lookAt(q2.x, q2.z, q2.y)
    // след ракеты: дымок каждые TRAIL_STEP клетки пути
    if (p.kind === 'rocket' && Math.hypot(q.x - r.lx, q.y - r.ly, q.z - r.lz) > TRAIL_STEP) {
      fx.spawn('puff', q.x, q.z, q.y)
      r.lx = q.x
      r.ly = q.y
      r.lz = q.z
    }
  }

  const offs: (() => void)[] = []
  function flashTower(id: number) {
    const t = session.battle?.state.towers.find((x) => x.id === id)
    if (t) fx.spawn('done', t.x, PAD_H + 0.4, t.y)
  }
  const battle0 = session.battle
  if (battle0 && opts.stress) for (const cmd of stressSetup(level.buildable)) battle0.dispatch(cmd)
  if (battle0) {
    offs.push(
      battle0.on('towerBuilt', (e) => flashTower(e.towerId)),
      battle0.on('towerUpgraded', (e) => flashTower(e.towerId)),
      battle0.on('projectileFired', (e) => {
        for (const p of battle0.state.projectiles)
          if (p.id === e.projectileId) fx.spawn('flash', p.fromX, p.fromZ, p.fromY)
      }),
      battle0.on('projectileImpact', (e) =>
        fx.spawn(e.kind === 'rocket' ? 'explosion' : 'spark', e.x, e.z, e.y),
      ),
    )
  }

  function frame(dtMs: number) {
    const battle = session.battle
    if (!battle) return
    const active = !session.paused && !session.outcome
    const alpha = active ? session.advance(dtMs) : 1
    const s = battle.state
    frameNo++
    input.tick(dtMs / 1000)
    models.begin()
    hud.begin()
    dbg?.begin()

    let nSh = 0
    for (const e of s.enemies) {
      const cfg = ENEMIES[e.type]
      let r = enemies.get(e.id)
      if (!r) {
        r = { px: e.x, py: e.y, pz: e.z, x: e.x, y: e.y, z: e.z, yaw: 0, tick: s.tick, seen: 0 }
        enemies.set(e.id, r)
      }
      r.seen = frameNo
      if (r.tick !== s.tick) {
        r.px = r.x
        r.py = r.y
        r.pz = r.z
        r.x = e.x
        r.y = e.y
        r.z = e.z
        r.tick = s.tick
        if (Math.abs(r.x - r.px) + Math.abs(r.y - r.py) > 1e-4)
          r.yaw = Math.atan2(r.x - r.px, r.y - r.py)
      }
      const x = r.px + (r.x - r.px) * alpha
      const y = r.py + (r.y - r.py) * alpha
      const z = r.pz + (r.z - r.pz) * alpha
      models.place(models.enemies[e.type], x, z, y, r.yaw, r.yaw)
      if (nSh < ENEMY_CAP) {
        // тень дрона меньше и бледнее с высотой
        const k = 0.6 / (1 + z * 0.6)
        enemyShadows.setMatrixAt(nSh++, _m.compose(_p.set(x, 0.025, y), _q, _s.set(k, 1, k)))
      }
      if (e.hp < e.maxHp) hud.bar(x, z + cfg.hitHeight + 0.2, y, e.hp / e.maxHp)
      dbg?.hitbox(x, z, y, 0.5, cfg.hitHeight)
    }
    enemyShadows.count = nSh
    enemyShadows.instanceMatrix.needsUpdate = true
    for (const [id, r] of enemies) if (r.seen !== frameNo) enemies.delete(id)

    let selected: number | null = null
    for (const t of s.towers) {
      let a = towerAim.get(t.id)
      if (!a) towerAim.set(t.id, (a = { yaw: 0, seen: 0 }))
      a.seen = frameNo
      const target = findEnemy(s.enemies, t.targetId)
      if (target) a.yaw = Math.atan2(target.x - t.x, target.y - t.y)
      const k = 1 + 0.1 * (t.level - 1)
      if (t.phase === 'queued') {
        // голограмма модели + спиннер «ждёт кредитов» на высоте кольца прогресса
        models.place(models.ghosts[t.type], t.x, PAD_H, t.y, 0, a.yaw, k)
        hud.waiting(t.x, PAD_H + 1.5, t.y, frameNo / 30)
      } else if (t.phase === 'active') {
        models.place(models.towers[t.type], t.x, PAD_H, t.y, 0, a.yaw, k)
      } else {
        // стройка/улучшение: модель целиком, прогресс между тиками
        const pr = Math.min(1, t.progress + (t.phaseTicksTotal > 0 ? alpha / t.phaseTicksTotal : 0))
        models.place(models.towers[t.type], t.x, PAD_H, t.y, 0, a.yaw, k)
        hud.progress(
          t.x,
          PAD_H + 1.5,
          t.y,
          pr,
          t.phase === 'building' ? BUILD_COLOR : UPGRADE_COLOR,
        )
      }
      hud.chevrons(t.x, PAD_H + 0.8, t.y, t.rank)
      if (t.id === session.selectedTowerId) {
        selected = towerStats(t.type, t.level, t.rank).range
        hud.ring(t.x, t.y, selected)
      }
    }
    // ghost: pendingCell (тач) или клетка под курсором
    const bt = session.buildType
    const gc = bt ? (session.pendingCell ?? input.hover()) : null
    ghostTile.visible = !!(gc && bt)
    if (gc && bt) {
      const cost = TOWERS[bt].levels[0].cost
      const valid =
        buildable.has(`${gc.x},${gc.y}`) &&
        !s.towers.some((t) => t.cell.x === gc.x && t.cell.y === gc.y) &&
        s.money >= cost
      ghostMat.color.setHex(valid ? 0x5fd35f : 0xd34a3a)
      ghostTile.position.set(gc.x + 0.5, PAD_H + 0.02, gc.y + 0.5)
      models.place(models.towers[bt], gc.x + 0.5, PAD_H, gc.y + 0.5, 0, 0)
      if (selected === null) {
        selected = TOWERS[bt].levels[0].range
        hud.ring(gc.x + 0.5, gc.y + 0.5, selected)
      }
    }
    const en = findEnemy(s.enemies, input.selectedEnemyId())
    if (selected === null && en) {
      const r = enemies.get(en.id)
      selected = 0.6
      hud.ring(r?.x ?? en.x, r?.y ?? en.y, selected)
    }
    const ho = selected === null ? input.hoverObj() : null
    if (ho?.kind === 'tower') {
      const t = s.towers.find((x) => x.id === ho.id)
      if (t) {
        selected = towerStats(t.type, t.level, t.rank).range
        hud.ring(t.x, t.y, selected)
      }
    } else if (ho) {
      const e = findEnemy(s.enemies, ho.id)
      if (e) {
        const r = enemies.get(e.id)
        selected = 0.6
        hud.ring(r?.x ?? e.x, r?.y ?? e.y, selected)
      }
    }
    if (selected === null) hud.ring(0, 0, null)
    for (const [id, a] of towerAim) if (a.seen !== frameNo) towerAim.delete(id)

    for (const p of s.projectiles) {
      syncProjectile(p, alpha)
    }
    for (const [id, r] of projs) {
      if (r.seen === frameNo) continue
      r.missile.visible = r.bullet.visible = false
      projs.delete(id)
      projPool.push(r)
    }

    fx.update(active ? dtMs * session.speed : 0)
    models.end()
    hud.end()
    if (dbg) {
      for (const p of s.projectiles) dbg.trajectory(p)
      dbg.end(
        dtMs,
        `tick ${s.tick}  enemies ${s.enemies.length}  towers ${s.towers.length}  proj ${s.projectiles.length}`,
      )
    }
    if (lost) return
    renderer.render(scene, rig.camera)
    rendered = true
  }

  const resize = () => {
    const w = host.clientWidth || 1
    const h = host.clientHeight || 1
    renderer.setSize(w, h)
    rig.setViewport(w, h)
  }
  const ro = new ResizeObserver(resize)
  ro.observe(host)
  resize()

  let last = performance.now()
  let raf = 0
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    const dt = Math.min(100, now - last)
    last = now
    frame(dt)
  }
  raf = requestAnimationFrame(loop)

  // потеря контекста: preventDefault разрешает восстановление; кадры не рисуем, пока контекста нет
  let lost = false
  const onLost = (ev: Event) => {
    ev.preventDefault()
    lost = true
    opts.onContextLost?.()
  }
  const onRestored = () => {
    lost = false
    opts.onContextRestored?.()
  }
  renderer.domElement.addEventListener('webglcontextlost', onLost)
  renderer.domElement.addEventListener('webglcontextrestored', onRestored)

  const dispose = () => {
    alive = false
    renderer.domElement.removeEventListener('webglcontextlost', onLost)
    renderer.domElement.removeEventListener('webglcontextrestored', onRestored)
    cancelAnimationFrame(raf)
    ro.disconnect()
    input.destroy()
    for (const off of offs) off()
    dbg?.dispose()
    for (const d of disposables) d.dispose()
    renderer.forceContextLoss()
    renderer.domElement.remove()
  }
  return {
    dispose,
    rig,
    canvas: renderer.domElement,
    ready: () => rendered,
    info: () => ({ ...renderer.info.memory, ...renderer.info.render }),
  }
}

import Phaser from 'phaser'
import { useBattleSession } from '@/entities/battle'
import { createEnemyLayer } from '@/entities/enemy'
import type { LevelData } from '@/entities/level'
import { createProjectileLayer } from '@/entities/projectile'
import { TOWERS, createTowerLayer, towerStats } from '@/entities/tower'
import { attachCameraControls, type CameraControls } from '@/features/camera-controls'
import { worldSize } from '@/shared/lib/iso'
import { fxOf } from '@/shared/lib/fx'
import { preloadSprites } from '@/shared/lib/sprites'
import type { DebugParams } from '@/shared/lib/debug'
import { createBattleAudio, preloadAudio } from './audio'
import { createDebugOverlay } from './debugOverlay'
import { attachBattleInput, type BattleInput } from './input'
import { createOverlay } from './overlay'
import { stressSetup, stressWantsWave } from './stress'
import { drawTerrain, elevationAtTile, preloadTerrain, tileKey, type Terrain } from './terrain'

export interface SceneData {
  level: LevelData
  params: DebugParams
}

const MARGIN = 96

export class BattleScene extends Phaser.Scene {
  private level!: LevelData
  private params!: DebugParams
  private terrain?: Terrain
  private controls?: CameraControls
  private input2?: BattleInput
  private debug?: ReturnType<typeof createDebugOverlay>
  private overlay?: ReturnType<typeof createOverlay>
  private towers?: ReturnType<typeof createTowerLayer>
  private enemies?: ReturnType<typeof createEnemyLayer>
  private projectiles?: ReturnType<typeof createProjectileLayer>
  private lastBattle: unknown = null
  private audio?: ReturnType<typeof createBattleAudio>
  private unbind?: () => void
  // скользящие средние для debug-оверлея, мс
  private frameMs = 16.7
  private simMs = 0
  private occupied = new Set<string>()
  private occupiedHash = -1
  private timing = { frameMs: 0, simMs: 0 }

  constructor() {
    super('battle')
  }

  init(data: SceneData) {
    this.level = data.level
    this.params = data.params
  }

  preload() {
    preloadSprites(this)
    preloadTerrain(this)
    preloadAudio(this)
  }

  create() {
    const session = useBattleSession()
    const size = worldSize()
    this.terrain = drawTerrain(this, this.level)
    this.towers = createTowerLayer(this, elevationAtTile)
    this.enemies = createEnemyLayer(this)
    this.projectiles = createProjectileLayer(this)
    this.overlay = createOverlay(this)
    this.debug = createDebugOverlay(this, this.level, this.params.debug)
    this.controls = attachCameraControls(this, {
      worldBounds: {
        x: -MARGIN,
        y: -MARGIN,
        width: size.width + MARGIN * 2,
        height: size.height + MARGIN * 2,
      },
      minZoom: 0.5,
      maxZoom: 2,
      keysEnabled: () => session.selectedTowerId === null,
    })
    this.input2 = attachBattleInput(this, session, this.controls, this.terrain.buildable, () =>
      this.debug?.toggle(),
    )
    this.cameras.main.centerOn(size.width / 2, size.height / 2)
    this.audio = createBattleAudio(this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unbind?.()
      this.unbind = undefined
      this.lastBattle = null
      this.audio?.destroy()
      this.towers?.clear()
      this.enemies?.clear()
      this.projectiles?.clear()
      this.overlay?.destroy()
    })
  }

  override update(_time: number, dtMs: number) {
    const session = useBattleSession()
    const battle = session.battle
    if (!battle) return
    if (battle !== this.lastBattle) {
      // бой перезапущен: сбрасываем виды
      this.lastBattle = battle
      this.towers?.clear()
      this.enemies?.clear()
      this.projectiles?.clear()
      this.occupiedHash = -1
      this.unbind?.()
      if (this.params.stress) {
        const buildable = this.level.buildable
        for (const cmd of stressSetup(buildable)) battle.dispatch(cmd)
      }
      this.unbind = this.audio?.bind(battle, {
        fired: (id) => this.towers?.fire(id),
        killed: (id) => this.enemies?.explode(id),
      })
    }
    const t0 = performance.now()
    const alpha = session.paused || session.outcome ? 1 : session.advance(dtMs)
    this.simMs += (performance.now() - t0 - this.simMs) * 0.05
    this.frameMs += (dtMs - this.frameMs) * 0.05
    if (this.params.stress) {
      const w = battle.state.wave
      if (stressWantsWave(battle.state.enemies.length, w.phase, w.number, w.total))
        battle.dispatch({ type: 'startWave' })
    }
    const s = battle.state
    this.towers?.sync(s.towers, session.selectedTowerId, s.enemies)
    this.enemies?.sync(s.enemies, s.tick, alpha)
    this.projectiles?.sync(s.projectiles, s.tick, alpha)
    this.projectiles?.update(dtMs)
    fxOf(this).update(dtMs)
    if (session.buildType !== null) {
      // Set пересобираем только при смене набора башен
      let hash = s.towers.length
      for (const t of s.towers) hash += t.id
      if (hash !== this.occupiedHash) {
        this.occupiedHash = hash
        this.occupied = new Set(s.towers.map((t) => tileKey(t.cell.x, t.cell.y)))
      }
    }
    this.terrain?.showBuildable(session.buildType !== null, this.occupied)

    if (!session.buildType) session.pendingCell = null
    const cell = session.pendingCell ?? this.input2?.hover() ?? null
    const type = session.buildType
    const valid =
      !!cell &&
      !!type &&
      this.terrain!.buildable.has(tileKey(cell.x, cell.y)) &&
      !s.towers.some((t) => t.cell.x === cell.x && t.cell.y === cell.y) &&
      s.money >= TOWERS[type].levels[0].cost
    const sel = s.towers.find((t) => t.id === session.selectedTowerId)
    this.overlay?.draw(
      type ? cell : null,
      type,
      valid,
      sel
        ? {
            x: sel.x,
            y: sel.y,
            range: towerStats(sel.type, sel.level, sel.rank).range,
            minRange: TOWERS[sel.type].minRange,
          }
        : null,
    )
    this.timing.frameMs = this.frameMs
    this.timing.simMs = this.simMs
    this.debug?.update(battle, this.timing)
  }
}

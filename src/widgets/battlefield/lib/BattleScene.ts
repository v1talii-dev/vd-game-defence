import Phaser from 'phaser'
import { useBattleSession } from '@/entities/battle'
import { createEnemyLayer } from '@/entities/enemy'
import type { LevelData } from '@/entities/level'
import { createProjectileLayer } from '@/entities/projectile'
import { TOWERS, createTowerLayer, towerStats } from '@/entities/tower'
import { attachCameraControls, type CameraControls } from '@/features/camera-controls'
import { worldSize } from '@/shared/lib/iso'
import { preloadSprites } from '@/shared/lib/sprites'
import type { DebugParams } from '@/shared/lib/debug'
import { createBattleAudio, preloadAudio } from './audio'
import { createDebugOverlay } from './debugOverlay'
import { attachBattleInput, type BattleInput } from './input'
import { createOverlay } from './overlay'
import { drawTerrain, elevationAtTile, tileKey, type Terrain } from './terrain'

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

  constructor() {
    super('battle')
  }

  init(data: SceneData) {
    this.level = data.level
    this.params = data.params
  }

  preload() {
    preloadSprites(this)
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
      this.audio?.destroy()
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
      this.unbind?.()
      this.unbind = this.audio?.bind(battle, {
        fired: (id) => this.towers?.fire(id),
        killed: (id) => this.enemies?.explode(id),
      })
    }
    const alpha = session.paused || session.outcome ? 1 : session.advance(dtMs)
    const s = battle.state
    this.towers?.sync(s.towers, session.selectedTowerId, s.enemies)
    this.enemies?.sync(s.enemies, s.tick, alpha)
    this.projectiles?.sync(s.projectiles, s.tick, alpha)
    this.projectiles?.update(dtMs)
    this.terrain?.showBuildable(
      session.buildType !== null,
      new Set(s.towers.map((t) => tileKey(t.cell.x, t.cell.y))),
    )

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
    this.debug?.update(battle)
  }
}

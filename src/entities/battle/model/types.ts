import type { EnemyState, EnemyType } from '@/entities/enemy/@x/battle'
import type { LevelData } from '@/entities/level/@x/battle'
import type { ProjectileState } from '@/entities/projectile/@x/battle'
import type { TargetPriority, TowerState, TowerType } from '@/entities/tower/@x/battle'

export interface Cell {
  x: number
  y: number
}

export type Command =
  | { type: 'placeTower'; towerType: TowerType; cell: Cell }
  | { type: 'upgradeTower'; towerId: number }
  | { type: 'sellTower'; towerId: number }
  // досрочный вызов: бонус = оставшиеся секунды паузы (вниз) × номер вызываемой волны
  | { type: 'startWave' }
  | { type: 'setTargetPriority'; towerId: number; priority: TargetPriority }
  // для debug/e2e
  | { type: 'grantMoney'; amount: number }

export type RejectReason =
  | 'notEnoughMoney'
  | 'notBuildable'
  | 'cellOccupied'
  | 'unknownTowerType'
  | 'towerNotFound'
  | 'maxLevel'
  | 'waveInProgress'
  | 'noMoreWaves'
  | 'invalidAmount'
  | 'invalidPriority'
  | 'unknownCommand'

export type BattleOutcome = { result: 'victory'; stars: 1 | 2 | 3 } | { result: 'defeat' }

export interface WaveProgress {
  // номер последней начатой волны, 0 — ещё ни одной
  number: number
  total: number
  // prep — пауза перед волной number + 1, active — идёт волна number
  phase: 'prep' | 'active'
  prepTicksLeft: number
  // тиков с начала активной волны
  elapsedTicks: number
  // сколько записей расписания волны уже заспавнено
  spawnIndex: number
}

export interface BattleState {
  seed: number
  levelId: string
  tick: number
  rng: number
  // счётчик стабильных id для башен, врагов и снарядов
  nextId: number
  money: number
  hqHp: number
  wave: WaveProgress
  towers: TowerState[]
  enemies: EnemyState[]
  projectiles: ProjectileState[]
  outcome: BattleOutcome | null
}

export type BattleEvent =
  | { type: 'commandApplied'; tick: number; cmd: Command }
  | { type: 'commandRejected'; cmd: Command; reason: RejectReason }
  | { type: 'moneyChanged'; money: number; delta: number }
  | { type: 'hqHpChanged'; hp: number; delta: number }
  | { type: 'waveStarted'; wave: number; total: number; early: boolean; bonus: number }
  | { type: 'waveCleared'; wave: number }
  | { type: 'towerPlaced'; towerId: number; towerType: TowerType; cell: Cell; cost: number }
  | { type: 'towerUpgraded'; towerId: number; level: number; cost: number }
  | { type: 'towerSold'; towerId: number; refund: number }
  | { type: 'towerRankUp'; towerId: number; rank: number }
  | { type: 'targetPriorityChanged'; towerId: number; priority: TargetPriority }
  | { type: 'enemySpawned'; enemyId: number; enemyType: EnemyType }
  | { type: 'enemyKilled'; enemyId: number; enemyType: EnemyType; towerId: number; reward: number }
  | { type: 'enemyLeaked'; enemyId: number; enemyType: EnemyType; damage: number }
  | { type: 'projectileFired'; projectileId: number; towerId: number; targetId: number }
  | { type: 'victory'; stars: 1 | 2 | 3; hqHp: number }
  | { type: 'defeat'; wave: number }

export type BattleEventType = BattleEvent['type']
export type BattleEventOf<T extends BattleEventType> = Extract<BattleEvent, { type: T }>

export interface BattleOptions {
  seed: number
  level: LevelData
  startMoney?: number
  // начать с этой волны (debug ?wave=N): перед ней всё равно идёт пауза подготовки
  startWave?: number
}

export interface Battle {
  // сериализуемый plain-объект; снаружи только читать
  readonly state: BattleState
  // параметры создания — нужны, чтобы собрать реплей
  readonly init: { seed: number; levelId: string; startMoney: number; startWave: number }
  // команда ставится в очередь и применяется в начале следующего тика
  dispatch(cmd: Command): void
  // продвинуть на n тиков (1 тик = 1/TICK_RATE с)
  step(n?: number): void
  on<T extends BattleEventType>(type: T, handler: (event: BattleEventOf<T>) => void): () => void
}

import type { EnemyState, EnemyType } from '@/entities/enemy/@x/battle'
import type { LevelConfig, LevelData } from '@/entities/level/@x/battle'
import type { ProjectileKind, ProjectileState } from '@/entities/projectile/@x/battle'
import type { TargetPriority, TowerState, TowerType } from '@/entities/tower/@x/battle'

export interface Cell {
  x: number
  y: number
}

export type Command =
  | { type: 'placeTower'; towerType: TowerType; cell: Cell }
  | { type: 'upgradeTower'; towerId: number }
  | { type: 'sellTower'; towerId: number }
  // отмена улучшения: возврат 100%
  | { type: 'cancelUpgrade'; towerId: number }
  // отмена стройки: неоплаченный заказ — без потерь, строящаяся — возврат 100%
  | { type: 'cancelBuild'; towerId: number }
  // досрочный вызов: бонус = оставшиеся секунды паузы (вниз) × номер вызываемой волны
  | { type: 'startWave' }
  | { type: 'setTargetPriority'; towerId: number; priority: TargetPriority }
  // ручной ремонт: цена списывается сразу, в очередь не ставится
  | { type: 'repairTower'; towerId: number }
  // восстановление руин: заказ в общей FIFO-очереди, ранг сохраняется
  | { type: 'restoreTower'; towerId: number }
  // убрать руины бесплатно: клетка свободна, ранг теряется
  | { type: 'clearRuins'; towerId: number }
  // для debug/e2e
  | { type: 'grantMoney'; amount: number }
  // debug/стресс-сцена: count врагов подряд вдоль пути с шагом spacing клеток (по умолчанию 0.5)
  | { type: 'spawnEnemies'; enemyType: EnemyType; count: number; spacing?: number }

export type RejectReason =
  | 'notEnoughMoney'
  | 'notBuildable'
  | 'cellOccupied'
  | 'unknownTowerType'
  // башня не входит в allowedTowers уровня
  | 'towerNotAllowed'
  | 'towerNotFound'
  | 'maxLevel'
  | 'alreadyUpgrading'
  | 'notUpgrading'
  | 'notBuilding'
  | 'stillBuilding'
  | 'upgradeInProgress'
  // ремонт: HP полное / башня строится или в руинах / ремонт уже идёт
  | 'fullHp'
  | 'notRepairable'
  | 'alreadyRepairing'
  // restoreTower/clearRuins не для руин; восстановление уже заказано
  | 'notRuins'
  | 'alreadyRestoring'
  | 'waveInProgress'
  | 'noMoreWaves'
  | 'invalidAmount'
  | 'unknownEnemyType'
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
  // заказ создан (башня уже в state.towers); waiting — ждёт оплаты, иначе сразу оплачен
  | { type: 'towerOrdered'; towerId: number; towerType: TowerType; cell: Cell; waiting: boolean }
  | { type: 'towerBuildStarted'; towerId: number; cost: number; ticks: number }
  | { type: 'towerBuilt'; towerId: number }
  // refund 0 для неоплаченного заказа
  | { type: 'towerBuildCancelled'; towerId: number; refund: number }
  | { type: 'towerUpgradeStarted'; towerId: number; toLevel: number; cost: number; ticks: number }
  // улучшение заказано, но не оплачено (встало в общую очередь); оплата → towerUpgradeStarted
  | {
      type: 'towerUpgradeOrdered'
      towerId: number
      toLevel: number
      cost: number
      waiting: boolean
    }
  // refund 0 для неоплаченного заказа
  | { type: 'towerUpgradeCancelled'; towerId: number; refund: number }
  // улучшение завершено (level — новый уровень)
  | { type: 'towerUpgraded'; towerId: number; level: number; cost: number }
  | { type: 'towerSold'; towerId: number; refund: number }
  | { type: 'towerRankUp'; towerId: number; rank: number }
  | { type: 'targetPriorityChanged'; towerId: number; priority: TargetPriority }
  | { type: 'enemySpawned'; enemyId: number; enemyType: EnemyType }
  | { type: 'enemyKilled'; enemyId: number; enemyType: EnemyType; towerId: number; reward: number }
  | { type: 'enemyLeaked'; enemyId: number; enemyType: EnemyType; damage: number }
  | { type: 'projectileFired'; projectileId: number; towerId: number; targetId: number }
  // враг выстрелил снарядом shell по башне towerId (M13b)
  | { type: 'enemyFired'; projectileId: number; enemyId: number; towerId: number }
  // башня получила урон от снаряда врага; amount — реально снятое HP
  | { type: 'towerDamaged'; towerId: number; amount: number; hp: number; attackerId: number }
  // HP = 0: башня стала руинами (ранг и опыт сохранены)
  | { type: 'towerDestroyed'; towerId: number; x: number; y: number }
  // ремонт оплачен (cost списан) и начался; ticks — длительность
  | { type: 'towerRepairStarted'; towerId: number; cost: number; ticks: number }
  // ремонт завершён (не приходит, если башню добили)
  | { type: 'towerRepaired'; towerId: number }
  // восстановление заказано; waiting — ждёт оплаты в общей очереди (дальше towerBuildStarted с флагом restoring в снимке)
  | { type: 'towerRestoreOrdered'; towerId: number; cost: number; waiting: boolean }
  // отмена заказа/стройки восстановления: башня остаётся руинами; refund 0 у неоплаченного
  | { type: 'towerRestoreCancelled'; towerId: number; refund: number }
  // руины восстановлены: башня active с полным HP и прежним рангом
  | { type: 'towerRestored'; towerId: number }
  // руины убраны, клетка свободна
  | { type: 'ruinsCleared'; towerId: number; cell: Cell }
  | {
      type: 'projectileImpact'
      x: number
      y: number
      z: number
      kind: ProjectileKind
      targetId: number
    }
  | { type: 'victory'; stars: 1 | 2 | 3; hqHp: number }
  | { type: 'defeat'; wave: number }

export type BattleEventType = BattleEvent['type']
export type BattleEventOf<T extends BattleEventType> = Extract<BattleEvent, { type: T }>

export interface BattleOptions {
  seed: number
  level: LevelData
  // данные уровня: волны, деньги, HP штаба, hpScale, allowedTowers; без него — общие значения по умолчанию
  config?: LevelConfig
  // перекрывает config.startMoney (debug, реплеи)
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

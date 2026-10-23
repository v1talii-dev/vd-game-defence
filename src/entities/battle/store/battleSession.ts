import { defineStore } from 'pinia'
import { markRaw, ref, shallowRef } from 'vue'
import { TICK_RATE } from '@/shared/config'
import type { LevelData } from '@/entities/level'
import { TOWERS, upgradeCost, type TowerState, type TowerType } from '@/entities/tower'
import { createBattle } from '../model/battle'
import { recordCommands, type Replay } from '../model/replay'
import type {
  Battle,
  BattleOptions,
  BattleOutcome,
  Cell,
  Command,
  RejectReason,
} from '../model/types'

const TICK_MS = 1000 / TICK_RATE
const PROGRESS_SYNC_TICKS = 5
// не больше стольких тиков за кадр, чтобы фризы вкладки не превращались в «догоняние»
const MAX_TICKS_PER_FRAME = 8 * 4

export type GameSpeed = 1 | 2 | 8

export interface QueueOrder {
  towerId: number
  type: TowerType
  kind: 'build' | 'upgrade'
  status: 'waiting' | 'working'
  // порядок сортировки (идущие — -1, ждущие — номер заказа)
  key: number
  toLevel: number
  progress: number
  cost: number
}

// Мост симуляция → Vue: держит Battle, крутит фиксированный шаг и зеркалит
// в реактивные поля только то, что меняется по событиям (SPEC §3.1).
export const useBattleSession = defineStore('battleSession', () => {
  const battle = shallowRef<Battle | null>(null)
  let recorder: ReturnType<typeof recordCommands> | null = null
  let accumulator = 0
  let progressSlot = -1

  // счётчик заказов без денег (для тоста)
  const queuedOrders = ref(0)
  const money = ref(0)
  const hqHp = ref(0)
  const waveNumber = ref(0)
  const waveTotal = ref(0)
  const wavePhase = ref<'prep' | 'active'>('prep')
  const prepSecondsLeft = ref(0)
  const outcome = ref<BattleOutcome | null>(null)
  const speed = ref<GameSpeed>(1)
  const paused = ref(false)
  const buildType = ref<TowerType | null>(null)
  const selectedTowerId = ref<number | null>(null)
  // копия выбранной башни для панели; обновляется по событиям
  const selectedTower = ref<TowerState | null>(null)
  // выбранная на тач-экране клетка под постройку, ждёт подтверждения
  const pendingCell = ref<Cell | null>(null)
  const lastRejected = ref<{ reason: RejectReason; at: number } | null>(null)
  const orders = ref<QueueOrder[]>([])
  // вид панели очереди: только на сессию, в сохранение не попадает
  const queueCollapsed = ref(false)
  const queueExpanded = ref(false)

  function syncSelected() {
    const t = battle.value?.state.towers.find((x) => x.id === selectedTowerId.value)
    selectedTower.value = t ? { ...t, cell: { ...t.cell } } : null
    if (!t) selectedTowerId.value = null
  }

  // Панель очереди: заказы в порядке оплаты (идущие первыми, потом ждущие по номеру заказа).
  // Пересобирается по событиям заказов и вместе с прогрессом выбранной башни.
  function syncOrders() {
    const list: QueueOrder[] = []
    for (const t of battle.value?.state.towers ?? []) {
      const base = { towerId: t.id, type: t.type }
      if (t.phase === 'active' && t.upgradeOrder === null) continue
      if (t.phase === 'queued')
        list.push({
          ...base,
          kind: 'build',
          status: 'waiting',
          key: t.id,
          toLevel: 1,
          progress: 0,
          cost: TOWERS[t.type].levels[0].cost,
        })
      else if (t.phase === 'building')
        list.push({
          ...base,
          kind: 'build',
          status: 'working',
          key: -1,
          toLevel: 1,
          progress: t.progress,
          cost: t.phasePaid,
        })
      else if (t.phase === 'upgrading')
        list.push({
          ...base,
          kind: 'upgrade',
          status: 'working',
          key: -1,
          toLevel: t.level + 1,
          progress: t.progress,
          cost: t.phasePaid,
        })
      else
        list.push({
          ...base,
          kind: 'upgrade',
          status: 'waiting',
          key: t.upgradeOrder!,
          toLevel: t.level + 1,
          progress: 0,
          cost: upgradeCost(t.type, t.level) ?? 0,
        })
    }
    list.sort((a, b) => a.key - b.key || a.towerId - b.towerId)
    orders.value = list
  }

  function syncWave() {
    const w = battle.value!.state.wave
    waveNumber.value = w.number
    waveTotal.value = w.total
    wavePhase.value = w.phase
    prepSecondsLeft.value = Math.ceil(w.prepTicksLeft / TICK_RATE)
  }

  function start(options: BattleOptions & { level: LevelData }) {
    const b = markRaw(createBattle(options))
    battle.value = b
    recorder = recordCommands(b)
    accumulator = 0
    money.value = b.state.money
    hqHp.value = b.state.hqHp
    outcome.value = null
    paused.value = false
    speed.value = 1
    buildType.value = null
    selectedTowerId.value = null
    selectedTower.value = null
    lastRejected.value = null
    queuedOrders.value = 0
    orders.value = []
    pendingCell.value = null
    syncWave()

    b.on('moneyChanged', (e) => (money.value = e.money))
    b.on('hqHpChanged', (e) => (hqHp.value = e.hp))
    b.on('waveStarted', syncWave)
    b.on('waveCleared', syncWave)
    b.on('victory', () => (outcome.value = b.state.outcome))
    b.on('defeat', () => (outcome.value = b.state.outcome))
    b.on('commandRejected', (e) => (lastRejected.value = { reason: e.reason, at: b.state.tick }))
    // тост «заказ в очереди» — один раз на заказ
    b.on('towerOrdered', (e) => {
      if (e.waiting) queuedOrders.value++
    })
    for (const type of [
      'towerOrdered',
      'towerBuildStarted',
      'towerBuilt',
      'towerBuildCancelled',
      'towerUpgradeOrdered',
      'towerUpgradeStarted',
      'towerUpgradeCancelled',
      'towerUpgraded',
      'towerSold',
      'towerRankUp',
      'targetPriorityChanged',
      'towerPlaced',
    ] as const) {
      b.on(type, syncSelected)
      b.on(type, syncOrders)
    }
    return b
  }

  function step(n = 1) {
    const b = battle.value
    if (!b) return
    const before = Math.floor(b.state.tick / TICK_RATE)
    b.step(n)
    // таймер паузы между волнами обновляем раз в секунду, а не каждый кадр
    if (Math.floor(b.state.tick / TICK_RATE) !== before) syncWave()
    // прогресс стройки/улучшения выбранной башни — 6 раз в секунду, не каждый кадр
    const working = orders.value.some((o) => o.status === 'working')
    if (working || (selectedTower.value && selectedTower.value.phase !== 'active')) {
      const slot = Math.floor(b.state.tick / PROGRESS_SYNC_TICKS)
      if (slot !== progressSlot) {
        syncSelected()
        if (working) syncOrders()
      }
      progressSlot = slot
    }
  }

  // Вызывается сценой каждый кадр. Возвращает долю тика для интерполяции.
  function advance(dtMs: number): number {
    if (!battle.value || paused.value || outcome.value) return 0
    accumulator += dtMs * speed.value
    const ticks = Math.min(Math.floor(accumulator / TICK_MS), MAX_TICKS_PER_FRAME)
    accumulator = ticks === MAX_TICKS_PER_FRAME ? 0 : accumulator - ticks * TICK_MS
    if (ticks > 0) step(ticks)
    return accumulator / TICK_MS
  }

  function dispatch(cmd: Command) {
    battle.value?.dispatch(cmd)
  }

  function select(towerId: number | null) {
    selectedTowerId.value = towerId
    if (towerId !== null) buildType.value = null
    syncSelected()
  }

  function setBuildType(type: TowerType | null) {
    buildType.value = type
    if (type) select(null)
  }

  function confirmBuild() {
    if (buildType.value && pendingCell.value) {
      // копия: реактивный Proxy не должен попасть в симуляцию и structuredClone реплея
      const { x, y } = pendingCell.value
      dispatch({ type: 'placeTower', towerType: buildType.value, cell: { x, y } })
    }
    pendingCell.value = null
  }

  function exportReplay(): Replay | null {
    return recorder?.replay() ?? null
  }

  function stop() {
    recorder?.stop()
    recorder = null
    battle.value = null
  }

  return {
    battle,
    money,
    hqHp,
    waveNumber,
    waveTotal,
    wavePhase,
    prepSecondsLeft,
    outcome,
    speed,
    paused,
    buildType,
    selectedTowerId,
    selectedTower,
    lastRejected,
    queuedOrders,
    orders,
    queueCollapsed,
    queueExpanded,
    pendingCell,
    confirmBuild,
    start,
    step,
    advance,
    dispatch,
    select,
    setBuildType,
    exportReplay,
    stop,
  }
})

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { LevelData } from '@/entities/level'
import { TOWERS, buildTicks } from '@/entities/tower'
import type { Command } from '../model/types'
import { useBattleSession } from './battleSession'

const level: LevelData = {
  id: 'test',
  width: 20,
  height: 6,
  path: [
    { x: 0, y: 0.5 },
    { x: 20, y: 0.5 },
  ],
  buildable: Array.from({ length: 20 }, (_, x) => ({ x, y: 1 })),
  spawn: { x: 0, y: 0.5 },
  hq: { x: 20, y: 0.5 },
}

const MG = TOWERS.machineGun.levels[0].cost
const place = (x: number): Command => ({
  type: 'placeTower',
  towerType: 'machineGun',
  cell: { x, y: 1 },
})

// A построена (активна), B ждёт оплаты, затем заказ улучшения A, затем C: общая FIFO вперемешку
function setup() {
  const s = useBattleSession()
  s.start({ seed: 1, level, startMoney: MG })
  s.dispatch(place(1))
  s.step()
  const [a] = s.battle!.state.towers
  s.dispatch(place(2))
  s.step()
  s.step(buildTicks('machineGun'))
  s.dispatch({ type: 'upgradeTower', towerId: a!.id })
  s.step()
  s.dispatch(place(3))
  s.step()
  const [, b, c] = s.battle!.state.towers
  return { s, a: a!, b: b!, c: c! }
}

const view = (s: ReturnType<typeof useBattleSession>) =>
  s.orders.map((o) => [o.towerId, o.kind, o.status] as const)

describe('очередь заказов в сторе боя', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('ждущие идут в порядке заказа: постройка и улучшение вперемешку', () => {
    const { s, a, b, c } = setup()
    expect(view(s)).toEqual([
      [b.id, 'build', 'waiting'],
      [a.id, 'upgrade', 'waiting'],
      [c.id, 'build', 'waiting'],
    ])
  })

  it('идущие стройки первыми, затем ждущие', () => {
    const { s, a, b, c } = setup()
    s.dispatch({ type: 'grantMoney', amount: MG })
    s.step()
    expect(view(s)).toEqual([
      [b.id, 'build', 'working'],
      [a.id, 'upgrade', 'waiting'],
      [c.id, 'build', 'waiting'],
    ])
    expect(s.orders[0]!.key).toBe(-1)
  })

  it('отмена убирает строку', () => {
    const { s, a, b, c } = setup()
    s.dispatch({ type: 'cancelBuild', towerId: b.id })
    s.step()
    expect(view(s)).toEqual([
      [a.id, 'upgrade', 'waiting'],
      [c.id, 'build', 'waiting'],
    ])
    s.dispatch({ type: 'cancelUpgrade', towerId: a.id })
    s.step()
    expect(view(s)).toEqual([[c.id, 'build', 'waiting']])
  })

  it('продажа башни с заказом улучшения убирает его', () => {
    const { s, a, b, c } = setup()
    s.dispatch({ type: 'sellTower', towerId: a.id })
    s.step()
    expect(view(s)).toEqual([
      [b.id, 'build', 'waiting'],
      [c.id, 'build', 'waiting'],
    ])
  })
})

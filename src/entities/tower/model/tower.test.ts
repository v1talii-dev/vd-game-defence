import { describe, expect, it } from 'vitest'
import { TICK_RATE } from '@/shared/config'
import { TOWERS } from '../config/towers'
import { rankForXp, selectTarget, sellRefund, towerStats, upgradeCost } from './tower'

describe('ранги', () => {
  it('пороги опыта 150 / 400 / 900', () => {
    expect(rankForXp(0)).toBe(0)
    expect(rankForXp(149)).toBe(0)
    expect(rankForXp(150)).toBe(1)
    expect(rankForXp(399)).toBe(1)
    expect(rankForXp(400)).toBe(2)
    expect(rankForXp(900)).toBe(3)
    expect(rankForXp(10_000)).toBe(3)
  })

  it('бонусы рангов к урону, скорострельности и дальности', () => {
    const base = TOWERS.rocket.levels[0]
    const r0 = towerStats('rocket', 1, 0)
    expect(r0).toEqual({
      damage: base.damage,
      reloadTicks: Math.round(base.reload * TICK_RATE),
      range: base.range,
    })
    expect(towerStats('rocket', 1, 1).damage).toBeCloseTo(base.damage * 1.1)
    const elite = towerStats('rocket', 1, 2)
    expect(elite.damage).toBeCloseTo(base.damage * 1.2)
    expect(elite.reloadTicks).toBe(Math.round((base.reload * TICK_RATE) / 1.1))
    const hero = towerStats('rocket', 1, 3)
    expect(hero.damage).toBeCloseTo(base.damage * 1.35)
    expect(hero.reloadTicks).toBe(Math.round((base.reload * TICK_RATE) / 1.2))
    expect(hero.range).toBeCloseTo(base.range * 1.1)
  })
})

describe('экономика башен', () => {
  it('продажа возвращает 70% вложенного с округлением вниз', () => {
    expect(sellRefund(100)).toBe(70)
    expect(sellRefund(175)).toBe(122)
    expect(sellRefund(175 + 140)).toBe(220)
  })

  it('цена апгрейда берётся из конфига, на максимуме — null', () => {
    expect(upgradeCost('mortar', 1)).toBe(TOWERS.mortar.levels[1].cost)
    expect(upgradeCost('mortar', 2)).toBe(TOWERS.mortar.levels[2].cost)
    expect(upgradeCost('mortar', 3)).toBeNull()
  })
})

describe('выбор цели', () => {
  const at = (id: number, x: number, distance: number, hp: number, air = false) => ({
    id,
    x,
    y: 0,
    distance,
    hp,
    air,
  })
  // башня в (0,0); враги на оси x
  const enemies = [at(1, 1, 10, 50), at(2, 2, 12, 200), at(3, 3, 14, 80), at(4, 10, 30, 999)]
  const tower = (type: 'machineGun' | 'mortar' | 'antiAir', priority = 'first' as const) => ({
    type,
    x: 0,
    y: 0,
    priority,
  })

  it('first — дальше всех по пути в радиусе', () => {
    expect(selectTarget(tower('machineGun'), 3.5, enemies)?.id).toBe(3)
  })

  it('strongest — больше всех HP', () => {
    const t = { ...tower('machineGun'), priority: 'strongest' as const }
    expect(selectTarget(t, 3.5, enemies)?.id).toBe(2)
  })

  it('closest — ближе всех к башне', () => {
    const t = { ...tower('machineGun'), priority: 'closest' as const }
    expect(selectTarget(t, 3.5, enemies)?.id).toBe(1)
  })

  it('нет целей в радиусе — null', () => {
    expect(selectTarget(tower('machineGun'), 0.5, enemies)).toBeNull()
  })

  it('миномёт не стреляет в мёртвую зону 1.5 клетки и по воздуху', () => {
    const t = { ...tower('mortar'), priority: 'closest' as const }
    expect(selectTarget(t, 6, enemies)?.id).toBe(2)
    expect(selectTarget(t, 6, [at(5, 1.4, 50, 10), at(6, 3, 1, 10, true)])).toBeNull()
  })

  it('ПВО бьёт только воздух, пулемёт — и землю, и воздух', () => {
    const mixed = [at(1, 1, 20, 50), at(2, 2, 10, 50, true)]
    expect(selectTarget(tower('antiAir'), 4, mixed)?.id).toBe(2)
    expect(selectTarget(tower('antiAir'), 4, [at(1, 1, 20, 50)])).toBeNull()
    expect(selectTarget(tower('machineGun'), 4, mixed)?.id).toBe(1)
    expect(selectTarget(tower('machineGun'), 4, [at(2, 2, 10, 50, true)])?.id).toBe(2)
  })
})

// @vitest-environment jsdom
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBattleSession } from '@/entities/battle'
import type { TowerState } from '@/entities/tower'
import TowerPanel from './TowerPanel.vue'

const tower = {
  id: 7,
  type: 'machineGun',
  cell: { x: 1, y: 1 },
  x: 1.5,
  y: 1.5,
  level: 1,
  xp: 0,
  rank: 0,
  invested: 100,
  cooldown: 0,
  priority: 'first',
} as TowerState

describe('TowerPanel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('пуста без выбранной башни', () => {
    expect(mount(TowerPanel).find('[data-testid=tower-panel]').exists()).toBe(false)
  })

  it('улучшение и продажа уходят командами', async () => {
    const s = useBattleSession()
    s.selectedTower = tower
    const dispatch = vi.spyOn(s, 'dispatch')
    const w = mount(TowerPanel)
    await w.get('[data-testid=tower-upgrade]').trigger('click')
    await w.get('[data-testid=tower-sell]').trigger('click')
    await w.get('[data-testid=prio-strongest]').trigger('click')
    expect(dispatch.mock.calls.map((c) => c[0])).toEqual([
      { type: 'upgradeTower', towerId: 7 },
      { type: 'sellTower', towerId: 7 },
      { type: 'setTargetPriority', towerId: 7, priority: 'strongest' },
    ])
  })
})

describe('TowerPanel: фазы', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('улучшение: прогресс, отмена, продажа заблокирована', async () => {
    const s = useBattleSession()
    s.selectedTower = {
      ...tower,
      phase: 'upgrading',
      progress: 0.5,
      phaseTicksTotal: 90,
      phaseTicksLeft: 45,
      phasePaid: 50,
    } as TowerState
    const dispatch = vi.spyOn(s, 'dispatch')
    const w = mount(TowerPanel)
    expect(w.get('[data-testid=tower-seconds]').text()).toBe('2 с')
    expect(w.get('[data-testid=tower-progress]').attributes('aria-valuenow')).toBe('50')
    expect(w.find('[data-testid=tower-upgrade]').exists()).toBe(false)
    expect(w.get('[data-testid=tower-sell]').attributes('disabled')).toBeDefined()
    await w.get('[data-testid=tower-cancel]').trigger('click')
    expect(dispatch).toHaveBeenCalledWith({ type: 'cancelUpgrade', towerId: 7 })
  })

  it('заказ в очереди: отмена без прогресса', async () => {
    const s = useBattleSession()
    s.selectedTower = { ...tower, phase: 'queued', progress: 0 } as TowerState
    const dispatch = vi.spyOn(s, 'dispatch')
    const w = mount(TowerPanel)
    expect(w.find('[data-testid=tower-progress]').exists()).toBe(false)
    await w.get('[data-testid=tower-cancel]').trigger('click')
    expect(dispatch).toHaveBeenCalledWith({ type: 'cancelBuild', towerId: 7 })
  })
})

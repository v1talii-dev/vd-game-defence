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

// @vitest-environment jsdom
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { useBattleSession } from '@/entities/battle'
import BattleHud from './BattleHud.vue'

describe('BattleHud', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('показывает деньги, штаб и волну из стора', () => {
    const s = useBattleSession()
    s.money = 250
    s.hqHp = 18
    s.waveNumber = 2
    s.waveTotal = 12
    const w = mount(BattleHud)
    expect(w.get('[data-testid=hud-money]').text()).toContain('250')
    expect(w.get('[data-testid=hud-hp]').text()).toContain('18/20')
    expect(w.get('[data-testid=hud-wave]').text()).toContain('2/12')
  })

  it('кнопка волны несёт бонус prepSecondsLeft * (волна + 1)', () => {
    const s = useBattleSession()
    s.waveNumber = 1
    s.waveTotal = 12
    s.prepSecondsLeft = 5
    const w = mount(BattleHud)
    expect(w.get('[data-testid=hud-start-wave]').text()).toContain('+10')
  })

  it('пауза переключает session.paused', async () => {
    const s = useBattleSession()
    const w = mount(BattleHud)
    await w.get('[data-testid=hud-pause]').trigger('click')
    expect(s.paused).toBe(true)
  })
})

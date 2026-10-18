import { TOWERS, type TowerType } from '@/entities/tower'
import type { Command } from '@/entities/battle'

export const STRESS_ENEMIES = 150
export const STRESS_TOWERS = 40

/** Команды стартовой расстановки: деньги и до 40 башен по кругу по типам на buildable-клетках */
export function stressSetup(buildable: readonly { x: number; y: number }[]): Command[] {
  const types = Object.keys(TOWERS) as TowerType[]
  const cmds: Command[] = [{ type: 'grantMoney', amount: 1_000_000 }]
  buildable.slice(0, STRESS_TOWERS).forEach((cell, i) => {
    cmds.push({ type: 'placeTower', towerType: types[i % types.length]!, cell: { ...cell } })
  })
  return cmds
}

/** Нужна ли ещё одна волна, чтобы на поле было ~150 врагов (спавн-команды в симуляции нет) */
export function stressWantsWave(
  enemies: number,
  phase: 'prep' | 'active',
  n: number,
  total: number,
) {
  return phase === 'prep' && n < total && enemies < STRESS_ENEMIES
}

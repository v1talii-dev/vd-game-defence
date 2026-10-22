import { TOWERS, type TowerType } from '@/entities/tower'
import type { Command } from '@/entities/battle'

export const STRESS_ENEMIES = 150
export const STRESS_TOWERS = 40

/** Команды стресс-сцены: деньги, до 40 башен по кругу по типам и STRESS_ENEMIES грантов вдоль пути */
export function stressSetup(buildable: readonly { x: number; y: number }[]): Command[] {
  const types = Object.keys(TOWERS) as TowerType[]
  const cmds: Command[] = [{ type: 'grantMoney', amount: 1_000_000 }]
  buildable.slice(0, STRESS_TOWERS).forEach((cell, i) => {
    cmds.push({ type: 'placeTower', towerType: types[i % types.length]!, cell: { ...cell } })
  })
  cmds.push({ type: 'spawnEnemies', enemyType: 'grunt', count: STRESS_ENEMIES })
  return cmds
}

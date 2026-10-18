import { TOWERS, upgradeCost, type TowerType } from '@/entities/tower'
import { createBattle, type Battle } from '@/entities/battle'
import type { LevelData } from '@/entities/level'

export type BotAction =
  | { place: TowerType; at: [number, number] }
  // апгрейд башни, поставленной на клетке
  | { upgrade: [number, number] }

// скриптовый бот: выполняет действия по порядку, как только хватает денег
export function runBot(
  level: LevelData,
  actions: readonly BotAction[],
  seed = 1,
  setup?: (battle: Battle) => void,
): Battle {
  const battle = createBattle({ seed, level })
  setup?.(battle)
  let next = 0
  let pending = false
  battle.on('commandApplied', () => (pending = false))
  while (!battle.state.outcome && battle.state.tick < 30 * 60 * 30) {
    const action = actions[next]
    if (action && !pending) {
      const s = battle.state
      if ('place' in action) {
        if (s.money >= TOWERS[action.place].levels[0].cost) {
          const [x, y] = action.at
          battle.dispatch({ type: 'placeTower', towerType: action.place, cell: { x, y } })
          pending = true
          next++
        }
      } else {
        const [x, y] = action.upgrade
        const tower = s.towers.find((t) => t.cell.x === x && t.cell.y === y)
        const cost = tower && upgradeCost(tower.type, tower.level)
        if (!tower || cost === null) next++
        else if (s.money >= cost!) {
          battle.dispatch({ type: 'upgradeTower', towerId: tower.id })
          pending = true
          next++
        }
      }
    }
    battle.step()
  }
  return battle
}

// эталонная расстановка: пулемёты на входе, миномёт на центральной высоте,
// ракеты и ПВО по внешней стороне петли, затем апгрейды
export const REFERENCE: readonly BotAction[] = [
  { place: 'machineGun', at: [6, 5] },
  { place: 'machineGun', at: [9, 5] },
  { place: 'mortar', at: [12, 8] },
  { place: 'rocket', at: [17, 7] },
  { place: 'machineGun', at: [12, 5] },
  { place: 'antiAir', at: [15, 5] },
  { place: 'rocket', at: [17, 10] },
  { place: 'mortar', at: [12, 9] },
  { upgrade: [12, 8] },
  { place: 'antiAir', at: [17, 13] },
  { place: 'rocket', at: [14, 12] },
  { upgrade: [17, 7] },
  { upgrade: [17, 10] },
  { upgrade: [15, 5] },
  { upgrade: [12, 9] },
  { place: 'rocket', at: [11, 12] },
  { upgrade: [12, 8] },
  { upgrade: [17, 7] },
  { upgrade: [17, 10] },
  { upgrade: [14, 12] },
  { upgrade: [11, 12] },
  { upgrade: [17, 13] },
  { place: 'rocket', at: [8, 17] },
  { upgrade: [8, 17] },
  { upgrade: [8, 17] },
  { upgrade: [14, 12] },
  { upgrade: [11, 12] },
]

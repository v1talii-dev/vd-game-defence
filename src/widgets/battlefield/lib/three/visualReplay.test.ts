import { expect, it } from 'vitest'
import { Scene } from 'three'
import { createBattle, runReplay, type Replay } from '@/entities/battle'
import type { LevelData } from '@/entities/level'
import { hashState } from '@/shared/lib/sim'
import { QUALITY_PROFILES } from '@/shared/lib/three'
import { createVisualWorld } from './visualWorld'

const level: LevelData = {
  id: 'test',
  width: 24,
  height: 6,
  path: [
    { x: 0, y: 2.5 },
    { x: 24, y: 2.5 },
  ],
  buildable: [{ x: 3, y: 1 }],
  spawn: { x: 0, y: 2.5 },
  hq: { x: 24, y: 2.5 },
}
const replay: Replay = {
  seed: 9,
  levelId: level.id,
  startMoney: 9999,
  commands: [
    { tick: 1, cmd: { type: 'placeTower', towerType: 'machineGun', cell: { x: 3, y: 1 } } },
    { tick: 121, cmd: { type: 'startWave' } },
    { tick: 121, cmd: { type: 'spawnEnemies', enemyType: 'boss', count: 3, spacing: 1 } },
  ],
}

it('the same replay has the same state with and without visual physics', async () => {
  const ticks = 1400
  const expected = hashState(runReplay(replay, level, ticks).state)
  for (const quality of [QUALITY_PROFILES.high, QUALITY_PROFILES.low]) {
    const visual = createVisualWorld(quality, new Scene())
    await visual.ready
    const battle = createBattle({ seed: replay.seed, level, startMoney: replay.startMoney })
    let destroyed = 0
    battle.on('towerDestroyed', (e) => {
      destroyed++
      visual.spawn(e.x, 0.5, e.y)
    })
    let i = 0
    let maxPieces = 0
    while (battle.state.tick < ticks && !battle.state.outcome) {
      while (i < replay.commands.length && replay.commands[i]!.tick <= battle.state.tick + 1) {
        battle.dispatch(replay.commands[i++]!.cmd)
      }
      battle.step()
      visual.update(1 / 30)
      maxPieces = Math.max(maxPieces, visual.count())
    }
    expect(destroyed).toBeGreaterThan(0)
    expect(maxPieces).toBe(quality.level === 'high' ? 6 : 0)
    expect(hashState(battle.state)).toBe(expected)
    visual.dispose()
  }
})

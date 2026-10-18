import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createBattle, recordCommands, runReplay, type Replay } from '@/entities/battle'
import { hashState } from '@/shared/lib/sim'
import { loadDesertBase } from '../helpers/level'

const level = loadDesertBase()
const reference: Replay = JSON.parse(
  readFileSync(new URL('./reference.json', import.meta.url), 'utf8'),
)

function hashesEvery100(replay: Replay): string[] {
  const hashes: string[] = []
  const battle = createBattle({ seed: replay.seed, level })
  let i = 0
  while (!battle.state.outcome) {
    while (i < replay.commands.length && replay.commands[i]!.tick <= battle.state.tick + 1) {
      battle.dispatch(replay.commands[i++]!.cmd)
    }
    battle.step()
    if (battle.state.tick % 100 === 0) hashes.push(hashState(battle.state))
  }
  return hashes
}

describe('детерминизм (SPEC §6.3)', () => {
  it('одинаковые seed и команды — одинаковый хэш на каждом сотом тике', () => {
    const a = hashesEvery100(reference)
    expect(a.length).toBeGreaterThan(100)
    expect(hashesEvery100(reference)).toEqual(a)
  })

  it('другой seed даёт другую партию (ГСЧ действительно участвует)', () => {
    expect(hashesEvery100({ ...reference, seed: reference.seed + 1 })).not.toEqual(
      hashesEvery100(reference),
    )
  })
})

describe('реплеи', () => {
  it('golden: reference.json проигрывается до победы, итог совпадает со снапшотом', () => {
    const { state } = runReplay(reference, level)
    expect(state.outcome?.result).toBe('victory')
    expect(state).toMatchSnapshot()
  })

  it('recordCommands → runReplay воспроизводит живую партию', () => {
    const battle = createBattle({ seed: 5, level })
    const rec = recordCommands(battle)
    battle.dispatch({ type: 'placeTower', towerType: 'mortar', cell: { x: 12, y: 8 } })
    battle.step(10)
    battle.dispatch({ type: 'startWave' })
    battle.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: { x: 6, y: 5 } })
    battle.step(600)
    const tower = battle.state.towers[1]!
    battle.dispatch({ type: 'setTargetPriority', towerId: tower.id, priority: 'strongest' })
    battle.step(300)
    rec.stop()

    const replay = JSON.parse(JSON.stringify(rec.replay())) as Replay
    expect(replay.commands.map((c) => c.tick)).toEqual([1, 11, 11, 611])
    expect(hashState(runReplay(replay, level, battle.state.tick).state)).toBe(
      hashState(battle.state),
    )
  })

  it('реплей другой карты отвергается', () => {
    expect(() => runReplay({ ...reference, levelId: 'other' }, level)).toThrow()
  })
})

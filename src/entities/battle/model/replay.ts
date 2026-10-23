import type { LevelConfig, LevelData } from '@/entities/level/@x/battle'
import { TICK_RATE } from '@/shared/config'
import { createBattle } from './battle'
import type { Battle, Command } from './types'

export interface ReplayCommand {
  // тик, на котором команда применилась (state.tick после инкремента)
  tick: number
  cmd: Command
}

export interface Replay {
  seed: number
  levelId: string
  startMoney?: number
  startWave?: number
  commands: ReplayCommand[]
}

// защита от бесконечного прогона, если бой не завершается: час игрового времени
const REPLAY_TICK_LIMIT = TICK_RATE * 60 * 60

// записывает каждую применённую команду с тиком; replay() отдаёт данные для exportReplay()
export function recordCommands(battle: Battle): { replay(): Replay; stop(): void } {
  const commands: ReplayCommand[] = []
  const stop = battle.on('commandApplied', ({ tick, cmd }) => {
    commands.push({ tick, cmd: structuredClone(cmd) })
  })
  return {
    replay: () => ({ ...battle.init, commands: structuredClone(commands) }),
    stop,
  }
}

// проигрывает реплей headless до untilTick или до конца боя
export function runReplay(
  replay: Replay,
  level: LevelData,
  untilTick?: number,
  config?: LevelConfig,
): Battle {
  if (replay.levelId !== level.id)
    throw new Error(`Реплей для карты ${replay.levelId}, а передана ${level.id}`)
  const battle = createBattle({
    seed: replay.seed,
    level,
    config,
    startMoney: replay.startMoney,
    startWave: replay.startWave,
  })
  const commands = [...replay.commands].sort((a, b) => a.tick - b.tick)
  const limit = untilTick ?? REPLAY_TICK_LIMIT
  let i = 0
  while (battle.state.tick < limit && !battle.state.outcome) {
    // команда с тиком T должна быть в очереди до шага, который сделает state.tick = T
    while (i < commands.length && commands[i]!.tick <= battle.state.tick + 1) {
      battle.dispatch(commands[i++]!.cmd)
    }
    battle.step()
  }
  return battle
}

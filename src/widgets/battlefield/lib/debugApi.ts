import { useBattleSession, type Replay } from '@/entities/battle'
import type { Command } from '@/entities/battle'
import type { LevelData } from '@/entities/level'

/** window.__game для e2e и отладки. Подключается только динамическим import в dev/test. */
export function installGameApi(level: LevelData): () => void {
  const session = useBattleSession()
  const api = {
    get state() {
      return session.battle?.state ?? null
    },
    session,
    dispatch: (cmd: Command) => session.dispatch(cmd),
    step: (n = 1) => session.step(n),
    setSpeed: (x: 1 | 2 | 8) => {
      session.speed = x
    },
    exportReplay: () => session.exportReplay(),
    /** Перезапускает бой и проигрывает команды реплея */
    loadReplay(json: Replay | string) {
      const r: Replay = typeof json === 'string' ? JSON.parse(json) : json
      session.start({
        seed: r.seed,
        level,
        startMoney: r.startMoney,
        startWave: r.startWave,
      })
      const cmds = [...r.commands].sort((a, b) => a.tick - b.tick)
      for (const c of cmds) {
        // команда с тиком T должна быть в очереди до шага, дающего state.tick = T
        while (session.battle!.state.tick + 1 < c.tick && !session.battle!.state.outcome) {
          session.step(1)
        }
        session.dispatch(c.cmd)
      }
    },
  }
  ;(window as unknown as { __game?: typeof api }).__game = api
  return () => {
    delete (window as unknown as { __game?: typeof api }).__game
  }
}

import { useBattleSession, type Replay } from '@/entities/battle'
import type { Command } from '@/entities/battle'
import type { LevelData } from '@/entities/level'
import type { CameraState } from '@/shared/lib/three'
import type { ThreeBattle } from './three3d'

/** window.__game для e2e и отладки (только dev/test): общая часть + cellToScreen / setCamera на камере Three */
export function installGameApi(level: LevelData, battle3d: ThreeBattle): () => void {
  const toPage = (p: { x: number; y: number }) => {
    const r = battle3d.canvas.getBoundingClientRect()
    return { x: r.left + p.x, y: r.top + p.y }
  }
  const api = {
    ...commonApi(level),
    get state() {
      return useBattleSession().battle?.state ?? null
    },
    get ready() {
      return battle3d.ready()
    },
    /** Центр клетки (целые x, y клетки; +0.5 добавляется здесь) в CSS-пикселях страницы */
    cellToScreen: (x: number, y: number) =>
      toPage(battle3d.rig.cellToScreen({ x: x + 0.5, y: y + 0.5 })),
    /** Задать камеру (x, y — точка взгляда в клетках, без +0.5); yaw применяется сразу */
    setCamera: (p: Partial<CameraState>) => battle3d.rig.setState(p),
    /** Память WebGL (renderer.info.memory) и draw calls последнего кадра */
    glInfo: () => battle3d.info(),
  }
  ;(window as unknown as { __game?: typeof api }).__game = api
  return () => {
    delete (window as unknown as { __game?: typeof api }).__game
  }
}

function commonApi(level: LevelData) {
  const session = useBattleSession()
  return {
    session,
    level,
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
}

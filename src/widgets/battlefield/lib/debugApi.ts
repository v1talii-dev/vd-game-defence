import type Phaser from 'phaser'
import { useBattleSession, type Replay } from '@/entities/battle'
import type { Command } from '@/entities/battle'
import type { LevelData } from '@/entities/level'
import { tileCenterToScreen } from '@/shared/lib/iso'

/** window.__game для e2e и отладки. Подключается только динамическим import в dev/test. */
export function installGameApi(level: LevelData, game: Phaser.Game): () => void {
  const session = useBattleSession()
  const api = {
    get state() {
      return session.battle?.state ?? null
    },
    /** сцена прошла preload и create: ввод и камера подключены */
    get ready() {
      return game.scene.isActive('battle')
    },
    session,
    level,
    /**
     * Центрирует камеру на клетке и возвращает client-координаты её центра (центр канваса).
     * После вызова надо дождаться кадра, чтобы матрица камеры обновилась.
     */
    cellToClient(cell: { x: number; y: number }) {
      const scene = game.scene.getScene('battle')
      if (!scene) throw new Error('сцена боя не найдена')
      const w = tileCenterToScreen(cell)
      scene.cameras.main.centerOn(w.x, w.y)
      const r = scene.game.canvas.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    },
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

import type { Page } from '@playwright/test'

interface Cell {
  x: number
  y: number
}

/** Минимальный тип window.__game, нужный тестам (полный — в widgets/battlefield/lib/debugApi.ts) */
export interface GameApi {
  state: {
    tick: number
    money: number
    towers: { id: number; type: string; level: number; invested: number; cell: Cell }[]
    outcome: { result: 'victory'; stars: number } | { result: 'defeat' } | null
    wave: { phase: 'prep' | 'active'; number: number; total: number }
  } | null
  session: { pendingCell: Cell | null; buildType: string | null; selectedTowerId: number | null }
  level: { width: number; height: number; path: Cell[]; buildable: Cell[] }
  dispatch(cmd: unknown): void
  step(n?: number): void
  setSpeed(x: 1 | 2 | 8): void
  cellToClient(cell: Cell): { x: number; y: number }
}

declare global {
  interface Window {
    __game?: GameApi
  }
}

/**
 * Открывает бой. Туториал заранее помечен пройденным (только если сохранения ещё нет),
 * чтобы подсказка не мешала; перезагрузка не затирает записанный прогресс.
 */
export async function openBattle(page: Page, query = ''): Promise<void> {
  await page.addInitScript(() => {
    const key = 'vdgd:save:v1'
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          levels: {},
          settings: { volume: 0.7, music: true, sfx: true, showRanges: false },
          tutorialDone: true,
        }),
      )
    }
  })
  await page.goto(`./#/battle${query}`)
  await page.waitForFunction(() => !!window.__game?.state)
  await page.locator('[data-testid="battlefield"] canvas').waitFor()
}

/** Свободная клетка, где строить можно (без башен), с отступом от начала списка */
export function pickBuildable(page: Page, index = 0): Promise<Cell> {
  return page.evaluate((i) => {
    const g = window.__game!
    const taken = new Set(g.state!.towers.map((t) => `${t.cell.x},${t.cell.y}`))
    const free = g.level.buildable.filter((c) => !taken.has(`${c.x},${c.y}`))
    return free[i]!
  }, index)
}

/** Клетка внутри карты, где строить нельзя (не buildable) */
export function pickBlocked(page: Page): Promise<Cell> {
  return page.evaluate(() => {
    const g = window.__game!
    const ok = new Set(g.level.buildable.map((c) => `${c.x},${c.y}`))
    // клетка пути заведомо не buildable; на случай иной карты — перебор
    const p = g.level.path[Math.floor(g.level.path.length / 2)]!
    const cand = { x: Math.floor(p.x), y: Math.floor(p.y) }
    if (!ok.has(`${cand.x},${cand.y}`)) return cand
    for (let y = 0; y < g.level.height; y++)
      for (let x = 0; x < g.level.width; x++) if (!ok.has(`${x},${y}`)) return { x, y }
    throw new Error('на карте нет небилдабельных клеток')
  })
}

/** Центрирует камеру на клетке, ждёт кадра и возвращает client-координаты клетки */
export async function cellClient(page: Page, cell: Cell): Promise<{ x: number; y: number }> {
  const pt = await page.evaluate((c) => window.__game!.cellToClient(c), cell)
  // матрица камеры обновляется в рендере: ждём два кадра, а не фиксированную паузу
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  )
  return pt
}

/** Сколько башен и кредитов сейчас в симуляции */
export function snapshot(page: Page): Promise<{ money: number; towers: number; tick: number }> {
  return page.evaluate(() => {
    const s = window.__game!.state!
    return { money: s.money, towers: s.towers.length, tick: s.tick }
  })
}

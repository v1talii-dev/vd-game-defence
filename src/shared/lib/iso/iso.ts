export interface IsoConfig {
  tileWidth: number
  tileHeight: number
  /** Размер карты в клетках */
  mapWidth: number
  mapHeight: number
}

export interface Point {
  x: number
  y: number
}

/** Конфиг по умолчанию: карта 24x24, тайл 64x32 (SPEC) */
export const DEFAULT_ISO: IsoConfig = { tileWidth: 64, tileHeight: 32, mapWidth: 24, mapHeight: 24 }

/**
 * Координаты клетки в симуляции: целое число — центр клетки, поэтому клетка (i, j)
 * занимает [i - 0.5, i + 0.5). Враги между клетками имеют дробные координаты.
 * Начало мира (0, 0) — левый верхний угол ограничивающего прямоугольника карты.
 */
export function cellToScreen(cell: Point, cfg: IsoConfig = DEFAULT_ISO): Point {
  const u = cell.x + 0.5
  const v = cell.y + 0.5
  return {
    x: ((u - v) * cfg.tileWidth) / 2 + (cfg.mapHeight * cfg.tileWidth) / 2,
    y: ((u + v) * cfg.tileHeight) / 2,
  }
}

/** Обратная к cellToScreen: пиксели мира -> дробные координаты клетки */
export function screenToCell(p: Point, cfg: IsoConfig = DEFAULT_ISO): Point {
  const a = (p.x - (cfg.mapHeight * cfg.tileWidth) / 2) / (cfg.tileWidth / 2) // u - v
  const b = p.y / (cfg.tileHeight / 2) // u + v
  return { x: (a + b) / 2 - 0.5, y: (b - a) / 2 - 0.5 }
}

/** Целая клетка под точкой мира (может выходить за границы карты) */
export function screenToTile(p: Point, cfg: IsoConfig = DEFAULT_ISO): Point {
  const c = screenToCell(p, cfg)
  return { x: Math.floor(c.x + 0.5), y: Math.floor(c.y + 0.5) }
}

/**
 * Координаты объекта Tiled (isometric): обе оси в пикселях tileheight,
 * угол клетки (0, 0) = (0, 0). Переводим в координаты клетки симуляции.
 */
export function tiledObjectToCell(obj: Point, cfg: IsoConfig = DEFAULT_ISO): Point {
  return { x: obj.x / cfg.tileHeight - 0.5, y: obj.y / cfg.tileHeight - 0.5 }
}

export function tileInBounds(t: Point, cfg: IsoConfig = DEFAULT_ISO): boolean {
  return t.x >= 0 && t.y >= 0 && t.x < cfg.mapWidth && t.y < cfg.mapHeight
}

/** Вершины ромба клетки (верх, право, низ, лево) в пикселях мира */
export function cellDiamond(tile: Point, cfg: IsoConfig = DEFAULT_ISO): Point[] {
  const c = cellToScreen(tile, cfg)
  const hw = cfg.tileWidth / 2
  const hh = cfg.tileHeight / 2
  return [
    { x: c.x, y: c.y - hh },
    { x: c.x + hw, y: c.y },
    { x: c.x, y: c.y + hh },
    { x: c.x - hw, y: c.y },
  ]
}

/** Размер мира в пикселях */
export function worldSize(cfg: IsoConfig = DEFAULT_ISO): { width: number; height: number } {
  return {
    width: ((cfg.mapWidth + cfg.mapHeight) * cfg.tileWidth) / 2,
    height: ((cfg.mapWidth + cfg.mapHeight) * cfg.tileHeight) / 2,
  }
}

/** Глубина для сортировки: экранный y центра (больше y — рисуется поверх) */
export function depthOf(cell: Point, cfg: IsoConfig = DEFAULT_ISO): number {
  return cellToScreen(cell, cfg).y
}

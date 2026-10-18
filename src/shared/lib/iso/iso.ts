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
 * Координаты в симуляции: клетка (i, j) занимает [i, i+1) x [j, j+1), её центр — (i+0.5, j+0.5).
 * Начало мира (0, 0) — левый верхний угол ограничивающего прямоугольника карты.
 */
export function cellToScreen(cell: Point, cfg: IsoConfig = DEFAULT_ISO): Point {
  return {
    x: ((cell.x - cell.y) * cfg.tileWidth) / 2 + (cfg.mapHeight * cfg.tileWidth) / 2,
    y: ((cell.x + cell.y) * cfg.tileHeight) / 2,
  }
}

/** Обратная к cellToScreen: пиксели мира -> дробные координаты симуляции */
export function screenToCell(p: Point, cfg: IsoConfig = DEFAULT_ISO): Point {
  const a = (p.x - (cfg.mapHeight * cfg.tileWidth) / 2) / (cfg.tileWidth / 2) // x - y
  const b = p.y / (cfg.tileHeight / 2) // x + y
  return { x: (a + b) / 2, y: (b - a) / 2 }
}

/** Целая клетка под точкой мира (может выходить за границы карты) */
export function screenToTile(p: Point, cfg: IsoConfig = DEFAULT_ISO): Point {
  const c = screenToCell(p, cfg)
  return { x: Math.floor(c.x), y: Math.floor(c.y) }
}

export function tileInBounds(t: Point, cfg: IsoConfig = DEFAULT_ISO): boolean {
  return t.x >= 0 && t.y >= 0 && t.x < cfg.mapWidth && t.y < cfg.mapHeight
}

/** Клетка под точкой мира или null, если точка вне карты */
export function pickTile(p: Point, cfg: IsoConfig = DEFAULT_ISO): Point | null {
  const t = screenToTile(p, cfg)
  return tileInBounds(t, cfg) ? t : null
}

/** Центр целой клетки в пикселях мира */
export function tileCenterToScreen(tile: Point, cfg: IsoConfig = DEFAULT_ISO): Point {
  return cellToScreen({ x: tile.x + 0.5, y: tile.y + 0.5 }, cfg)
}

/**
 * Координаты объекта Tiled (isometric): обе оси в пикселях tileheight,
 * поэтому координата симуляции = px / tileheight.
 */
export function tiledObjectToCell(obj: Point, cfg: IsoConfig = DEFAULT_ISO): Point {
  return { x: obj.x / cfg.tileHeight, y: obj.y / cfg.tileHeight }
}

/** Вершины ромба клетки (верх, право, низ, лево) в пикселях мира */
export function cellDiamond(tile: Point, cfg: IsoConfig = DEFAULT_ISO): Point[] {
  const c = tileCenterToScreen(tile, cfg)
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

/** Глубина для сортировки: экранный y точки (больше y — рисуется поверх) */
export function depthOf(cell: Point, cfg: IsoConfig = DEFAULT_ISO): number {
  return cellToScreen(cell, cfg).y
}

/** Круг радиуса r клеток на экране — эллипс с такими полуосями */
export function radiusToScreen(
  r: number,
  cfg: IsoConfig = DEFAULT_ISO,
): { rx: number; ry: number } {
  return { rx: (r * Math.SQRT2 * cfg.tileWidth) / 2, ry: (r * Math.SQRT2 * cfg.tileHeight) / 2 }
}

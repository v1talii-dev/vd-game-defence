export interface Point {
  x: number
  y: number
}

export interface LevelData {
  id: string
  width: number
  height: number
  // полилиния пути в координатах клеток (float), от спавна к штабу
  path: Point[]
  // целые координаты клеток, где можно строить
  buildable: Point[]
  spawn: Point
  hq: Point
}

interface TiledLayer {
  name: string
  type: string
  data?: unknown
  objects?: { name: string; x: number; y: number; polyline?: Point[] }[]
}

interface TiledMap {
  orientation: string
  width: number
  height: number
  tileheight: number
  layers: TiledLayer[]
}

/**
 * Парсер Tiled JSON (.tmj, orientation isometric) → LevelData.
 * В изометрических картах Tiled координаты объектов задаются в пикселях
 * «развёрнутой» сетки, где обе оси измеряются в tileheight, поэтому клетка = px / tileheight
 * (и для x, и для y). Точки polyline заданы относительно x/y объекта.
 * Спавн — первая точка пути, штаб — последняя.
 */
export function parseTiledLevel(id: string, json: unknown): LevelData {
  const map = json as TiledMap
  if (map?.orientation !== 'isometric') throw new Error(`Карта ${id}: ожидается isometric`)
  if (!Array.isArray(map.layers)) throw new Error(`Карта ${id}: нет слоёв`)

  const buildLayer = map.layers.find((l) => l.name === 'buildable' && l.type === 'tilelayer')
  if (!Array.isArray(buildLayer?.data) || buildLayer.data.length !== map.width * map.height)
    throw new Error(`Карта ${id}: нет tile layer buildable (нужен формат data: массив)`)
  const buildable: Point[] = []
  buildLayer.data.forEach((gid, i) => {
    if (gid !== 0) buildable.push({ x: i % map.width, y: Math.floor(i / map.width) })
  })

  const pathObj = map.layers
    .filter((l) => l.type === 'objectgroup')
    .flatMap((l) => l.objects ?? [])
    .find((o) => o.name === 'path')
  if (!pathObj?.polyline || pathObj.polyline.length < 2)
    throw new Error(`Карта ${id}: нет polyline path`)
  const th = map.tileheight
  const path = pathObj.polyline.map((p) => ({
    x: (pathObj.x + p.x) / th,
    y: (pathObj.y + p.y) / th,
  }))

  return {
    id,
    width: map.width,
    height: map.height,
    path,
    buildable,
    spawn: path[0]!,
    hq: path[path.length - 1]!,
  }
}

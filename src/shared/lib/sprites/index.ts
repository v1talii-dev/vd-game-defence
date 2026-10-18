import type Phaser from 'phaser'

export const SPRITE_ROLES = [
  'machineGun',
  'rocket',
  'mortar',
  'antiAir',
  'grunt',
  'grenadier',
  'technical',
  'tank',
  'drone',
  'boss',
  'hq',
] as const

export const EXPLODE_FRAMES = 12

// Соответствие направления на экране кадру PixVoxel (face 0-3).
// Порядок подобран на глаз и меняется только здесь: [вниз-вправо, вниз-влево, вверх-влево, вверх-вправо].
const FACE_ORDER = [0, 1, 2, 3] as const

/** Кадр (face 0-3) по вектору в экранных координатах; null, если вектор почти нулевой */
export function faceFromScreen(dx: number, dy: number): number | null {
  if (Math.abs(dx) + Math.abs(dy) < 1e-3) return null
  const q = dx >= 0 ? (dy >= 0 ? 0 : 3) : dy >= 0 ? 1 : 2
  return FACE_ORDER[q]!
}

export const spriteKey = (role: string, face: number) => `${role}_${face}`

export function hasSprite(scene: Phaser.Scene, role: string): boolean {
  return scene.textures.exists(spriteKey(role, 0))
}

/** Загружает кадры спрайтов; ошибки только логируются: без спрайтов работают заглушки */
export function preloadSprites(
  scene: Phaser.Scene,
  base = `${import.meta.env.BASE_URL}assets/sprites/`,
) {
  // shortcut: отдельные PNG вместо атласа, собрать атлас при росте числа кадров
  for (const role of SPRITE_ROLES) {
    for (let f = 0; f < 4; f++) scene.load.image(spriteKey(role, f), `${base}${role}_${f}.png`)
  }
  for (let i = 0; i < EXPLODE_FRAMES; i++)
    scene.load.image(`explode_${i}`, `${base}explode_${i}.png`)
  scene.load.on('loaderror', (file: { key: string; url: unknown }) =>
    console.error(`[sprites] не загрузился ${file.key}`, file.url),
  )
}

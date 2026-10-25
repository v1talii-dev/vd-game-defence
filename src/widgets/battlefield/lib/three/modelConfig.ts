// Таблица GLB-моделей: файл, масштаб (клетка = 1.0) и поправка рысканья (ствол/нос в +Z).
export interface GlbSpec {
  file: string
  scale: number
  yawFix: number
}

const s = (file: string, scale = 1, yawFix = 0): GlbSpec => ({ file, scale, yawFix })

export const TOWER_GLB = {
  machineGun: s('tower_machinegun'),
  rocket: s('tower_rocket'),
}
export const RUINS_GLB = {
  machineGun: s('ruins_machinegun'),
  rocket: s('ruins_rocket'),
}
export const ENEMY_GLB = {
  grunt: s('enemy_grunt'),
  grenadier: s('enemy_grenadier'),
  technical: s('enemy_technical'),
  tank: s('enemy_tank'),
  // дрон низкий (0.21) — увеличен для читаемости
  drone: s('enemy_drone', 1.3),
  boss: s('enemy_boss'),
}
export const DECO_GLB = { tree: s('deco_tree'), rock: s('deco_rock'), ruin: s('deco_ruin') }
export const HEAD_NODES = new Set(['head', 'turret'])

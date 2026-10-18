// Копирует нужные кадры PixVoxel в public/assets/sprites. Запуск: node scripts/copy-sprites.mjs <папка пака>
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { argv } from 'node:process'

const src = argv[2]
if (!src) throw new Error('укажите папку Revised_PixVoxel_Wargame')
const out = join(import.meta.dirname, '..', 'public', 'assets', 'sprites')
mkdirSync(out, { recursive: true })

// роль -> [палитра, юнит]
const units = {
  machineGun: ['color6', 'Artillery_P'],
  rocket: ['color6', 'Artillery_T'],
  mortar: ['color6', 'Artillery'],
  antiAir: ['color6', 'Artillery_S'],
  grunt: ['color2', 'Infantry'],
  grenadier: ['color2', 'Infantry_P'],
  technical: ['color2', 'Tank_T'],
  tank: ['color2', 'Tank'],
  drone: ['color2', 'Copter_S'],
  boss: ['color2', 'Tank_P'],
  hq: ['color6', 'Castle'],
}
for (const [role, [c, u]] of Object.entries(units)) {
  for (let f = 0; f < 4; f++) {
    copyFileSync(
      join(src, 'standing_frames', `${c}_${u}_Large_face${f}_0.png`),
      join(out, `${role}_${f}.png`),
    )
  }
}
for (let i = 0; i < 12; i++) {
  copyFileSync(
    join(src, 'animation_frames', `color2_Tank_Large_face0_fiery_explode_${i}.png`),
    join(out, `explode_${i}.png`),
  )
}

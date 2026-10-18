import type Phaser from 'phaser'
import { watch } from 'vue'
import type { Battle } from '@/entities/battle'
import { useProgressStore } from '@/entities/progress'
import type { TowerType } from '@/entities/tower'

const SFX = [
  'mg-fire',
  'rocket-fire',
  'mortar-fire',
  'aa-fire',
  'explosion-small',
  'explosion-medium',
  'explosion-large',
  'hit',
  'build',
  'leak',
  'upgrade',
  'sell',
  'error',
  'rank-up',
  'click',
  'wave-start',
  'victory',
  'defeat',
] as const
type Sfx = (typeof SFX)[number]

const FIRE_SFX: Record<TowerType, Sfx> = {
  machineGun: 'mg-fire',
  rocket: 'rocket-fire',
  mortar: 'mortar-fire',
  antiAir: 'aa-fire',
}
const MAX_PER_KEY = 3
const SFX_GAIN = 0.8
const MUSIC_GAIN = 0.3

export function preloadAudio(
  scene: Phaser.Scene,
  base = `${import.meta.env.BASE_URL}assets/audio/`,
) {
  for (const k of SFX) scene.load.audio(`sfx-${k}`, `${base}sfx/${k}.ogg`)
  scene.load.audio('music-battle', `${base}music/battle.mp3`)
}

/** Звук боя: громкость и вкл/выкл берутся из настроек и реагируют на их изменение */
export function createBattleAudio(scene: Phaser.Scene) {
  const progress = useProgressStore()
  const active = new Map<string, number>()
  const music = scene.cache.audio.exists('music-battle')
    ? scene.sound.add('music-battle', { loop: true })
    : null

  const applyMusic = () => {
    const s = progress.settings
    if (!music) return
    ;(music as Phaser.Sound.WebAudioSound).setVolume(s.volume * MUSIC_GAIN)
    if (s.music && s.volume > 0) {
      if (!music.isPlaying) music.play()
    } else if (music.isPlaying) music.stop()
  }
  const stopWatch = watch(() => ({ ...progress.settings }), applyMusic, { immediate: true })

  function play(key: Sfx) {
    const s = progress.settings
    if (!s.sfx || s.volume <= 0 || !scene.cache.audio.exists(`sfx-${key}`)) return
    const n = active.get(key) ?? 0
    if (n >= MAX_PER_KEY) return
    const snd = scene.sound.add(`sfx-${key}`, { volume: s.volume * SFX_GAIN })
    active.set(key, n + 1)
    snd.once('complete', () => {
      active.set(key, (active.get(key) ?? 1) - 1)
      snd.destroy()
    })
    snd.play()
  }

  /** Подписка на события боя; возвращает отписку */
  function bind(
    b: Battle,
    extra?: { fired?: (towerId: number) => void; killed?: (enemyId: number) => void },
  ) {
    const offs = [
      b.on('projectileFired', (e) => {
        const t = b.state.towers.find((x) => x.id === e.towerId)
        if (t) play(FIRE_SFX[t.type])
        extra?.fired?.(e.towerId)
      }),
      b.on('enemyKilled', (e) => {
        play(
          e.enemyType === 'tank' || e.enemyType === 'boss'
            ? 'explosion-large'
            : e.enemyType === 'technical' || e.enemyType === 'grenadier'
              ? 'explosion-medium'
              : 'explosion-small',
        )
        extra?.killed?.(e.enemyId)
      }),
      b.on('towerPlaced', () => play('build')),
      b.on('towerUpgraded', () => play('upgrade')),
      b.on('towerSold', () => play('sell')),
      b.on('commandRejected', () => play('error')),
      b.on('towerRankUp', () => play('rank-up')),
      b.on('enemyLeaked', () => play('leak')),
      b.on('waveStarted', () => play('wave-start')),
      b.on('victory', () => play('victory')),
      b.on('defeat', () => play('defeat')),
    ]
    return () => offs.forEach((off) => off())
  }

  return {
    bind,
    destroy() {
      stopWatch()
      music?.stop()
      music?.destroy()
    },
  }
}

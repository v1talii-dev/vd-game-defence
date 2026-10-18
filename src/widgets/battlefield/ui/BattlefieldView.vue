<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type Phaser from 'phaser'
import { useBattleSession } from '@/entities/battle'
import { parseTiledLevel, type LevelData } from '@/entities/level'
import { createLogger, readLocationParams } from '@/shared/lib/debug'
import { t } from '@/shared/i18n'
import { UiButton } from '@/shared/ui'
import { createGame } from '../lib/createGame'

const LEVEL_ID = 'desert-base'
const log = createLogger('render')

const host = ref<HTMLDivElement>()
const failed = ref(false)
const session = useBattleSession()
let game: Phaser.Game | undefined
let uninstallApi: (() => void) | undefined
let disposed = false

async function load() {
  failed.value = false
  let level: LevelData
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}assets/maps/${LEVEL_ID}.tmj`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    level = parseTiledLevel(LEVEL_ID, await res.json())
  } catch (e) {
    log.error('не удалось загрузить карту', e)
    failed.value = true
    return
  }
  if (disposed) return
  const params = readLocationParams(window.location)
  session.start({
    seed: params.seed ?? Math.floor(Math.random() * 2 ** 31),
    level,
    startMoney: params.money,
    startWave: params.wave,
  })
  if (params.speed) session.speed = params.speed
  game = createGame(host.value!, { level, params })
  if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
    void import('../lib/debugApi').then((m) => {
      if (!disposed) uninstallApi = m.installGameApi(level, game!)
    })
  }
}

onMounted(load)
onBeforeUnmount(() => {
  disposed = true
  uninstallApi?.()
  game?.destroy(true)
  game = undefined
  session.stop()
})
</script>

<template>
  <div class="battlefield" data-testid="battlefield">
    <div ref="host" class="canvas" />
    <div v-if="failed" class="error" role="alert" data-testid="map-error">
      <p>{{ t.battlefield.loadError }}</p>
      <UiButton @click="load">{{ t.battlefield.retry }}</UiButton>
    </div>
  </div>
</template>

<style scoped>
.battlefield {
  position: relative;
  width: 100%;
  height: 100%;
}
.canvas {
  width: 100%;
  height: 100%;
}
.error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #f0e6d0;
  background: #1c1a14;
}
</style>

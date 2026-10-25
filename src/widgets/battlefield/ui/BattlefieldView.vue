<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useBattleSession } from '@/entities/battle'
import { getLevel, parseTiledLevel, type LevelConfig, type LevelData } from '@/entities/level'
import { createLogger, readLocationParams } from '@/shared/lib/debug'
import { t } from '@/shared/i18n'
import { UiButton, UiLoading } from '@/shared/ui'

const props = defineProps<{ levelId: string }>()
const log = createLogger('render')

const host = ref<HTMLDivElement>()
const failed = ref(false)
const loading = ref(true)
// WebGL-контекст потерян: браузер может вернуть его сам (webglcontextrestored)
const glLost = ref(false)
const session = useBattleSession()
let uninstallApi: (() => void) | undefined
let dispose3d: (() => void) | undefined
let disposed = false

async function load() {
  failed.value = false
  let level: LevelData
  let config: LevelConfig
  try {
    config = getLevel(props.levelId)
    const res = await fetch(`${import.meta.env.BASE_URL}${config.tmj}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    level = parseTiledLevel(config.id, await res.json())
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
    config,
    startMoney: params.money,
    startWave: params.wave,
  })
  if (params.speed) session.speed = params.speed
  const m = await import('../lib/three3d')
  if (disposed) return
  const b3d = m.createThreeBattle(host.value!, level, {
    stress: params.stress,
    onContextLost: () => (glLost.value = true),
    onContextRestored: () => (glLost.value = false),
  })
  dispose3d = b3d.dispose
  // ждём первый кадр (GLB, текстуры) — готовность рендера, не симуляции
  const poll = setInterval(() => {
    if (disposed || b3d.ready()) {
      clearInterval(poll)
      loading.value = false
    }
  }, 50)
  if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
    void import('../lib/debugApi').then((d) => {
      if (!disposed) uninstallApi = d.installGameApi(level, b3d)
    })
  }
}

onMounted(load)
onBeforeUnmount(() => {
  disposed = true
  uninstallApi?.()
  dispose3d?.()
  session.stop()
})
</script>

<template>
  <div class="battlefield" data-testid="battlefield">
    <div ref="host" class="canvas" />
    <UiLoading :active="loading && !failed" />
    <div v-if="glLost" class="error" role="alert" data-testid="gl-lost">
      <p>{{ t.battlefield.glLost }}</p>
    </div>
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
  /* жесты камеры обрабатываем сами: браузер не скроллит и не зумит страницу */
  touch-action: none;
}
.canvas :deep(canvas) {
  touch-action: none;
  -webkit-touch-callout: none;
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

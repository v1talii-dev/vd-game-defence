<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { HQ_HP, useBattleSession } from '@/entities/battle'
import { t } from '@/shared/i18n'
import { UiButton, UiIcon } from '@/shared/ui'

const session = useBattleSession()

const bonus = computed(() => session.prepSecondsLeft * (session.waveNumber + 1))
const canStart = computed(
  () => session.wavePhase === 'prep' && session.waveNumber < session.waveTotal,
)

const toast = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => session.lastRejected,
  (r) => {
    if (!r) return
    toast.value = (t.reject as Record<string, string>)[r.reason] ?? t.reject.other
    clearTimeout(timer)
    timer = setTimeout(() => (toast.value = ''), 1800)
  },
)
</script>

<template>
  <header class="hud">
    <div class="stat" data-testid="hud-money">{{ t.hud.money }}: {{ session.money }}</div>
    <div class="stat" data-testid="hud-hp">{{ t.hud.hq }}: {{ session.hqHp }}/{{ HQ_HP }}</div>
    <div class="stat" data-testid="hud-wave">
      {{
        t.hud.wave
          .replace('{n}', String(session.waveNumber))
          .replace('{total}', String(session.waveTotal))
      }}
    </div>
    <div class="stat" data-testid="hud-timer">
      {{
        session.wavePhase === 'prep'
          ? t.hud.nextIn.replace('{n}', String(session.prepSecondsLeft))
          : t.hud.waveActive
      }}
    </div>
    <UiButton
      v-if="canStart"
      data-testid="hud-start-wave"
      @click="session.dispatch({ type: 'startWave' })"
    >
      {{ bonus > 0 ? t.hud.startWaveBonus.replace('{n}', String(bonus)) : t.hud.startWave }}
    </UiButton>
    <UiButton
      variant="secondary"
      :aria-label="t.hud.pause"
      data-testid="hud-pause"
      @click="session.paused = !session.paused"
    >
      <UiIcon name="pause" :size="20" />
    </UiButton>
    <UiButton
      variant="secondary"
      :aria-label="t.hud.speed.replace('{n}', session.speed === 1 ? '2' : '1')"
      data-testid="hud-speed"
      @click="session.speed = session.speed === 1 ? 2 : 1"
    >
      x{{ session.speed }}
    </UiButton>
    <div v-if="toast" class="toast" role="status" data-testid="hud-toast">{{ toast }}</div>
  </header>
</template>

<style scoped>
.hud {
  position: absolute;
  top: var(--safe-top);
  left: var(--safe-left);
  right: var(--safe-right);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: rgb(28 26 20 / 80%);
  pointer-events: auto;
}
.stat {
  padding: 0 8px;
  font-weight: 700;
}
.toast {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 8px;
  padding: 8px 16px;
  background: var(--c-accent);
  color: var(--c-bg);
  border-radius: 4px;
  font-weight: 700;
}
</style>

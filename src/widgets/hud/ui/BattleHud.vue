<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { HQ_HP, useBattleSession } from '@/entities/battle'
import { t } from '@/shared/i18n'
import { UiButton, UiIcon } from '@/shared/ui'

const session = useBattleSession()

const hpPct = computed(() => Math.max(0, Math.min(100, (session.hqHp / HQ_HP) * 100)))
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
    <div class="group">
      <div class="stat money" data-testid="hud-money">
        <UiIcon name="coin" :size="26" />
        <span class="cap">{{ t.hud.money }}</span>
        <b class="val">{{ session.money }}</b>
      </div>
      <div class="stat hq" :class="{ low: hpPct <= 30 }" data-testid="hud-hp">
        <UiIcon name="shield" :size="26" />
        <span class="cap">{{ t.hud.hq }}</span>
        <b class="val">{{ session.hqHp }}/{{ HQ_HP }}</b>
        <i class="bar"><i :style="{ width: hpPct + '%' }" /></i>
      </div>
    </div>
    <div class="group center">
      <div class="stat wave" data-testid="hud-wave">
        <UiIcon name="wave" :size="22" />
        <b class="val">{{
          t.hud.wave
            .replace('{n}', String(session.waveNumber))
            .replace('{total}', String(session.waveTotal))
        }}</b>
      </div>
      <div class="stat timer" data-testid="hud-timer">
        <UiIcon name="clock" :size="20" />
        <span>{{
          session.wavePhase === 'prep'
            ? t.hud.nextIn.replace('{n}', String(session.prepSecondsLeft))
            : t.hud.waveActive
        }}</span>
      </div>
      <UiButton
        v-if="canStart"
        class="start"
        data-testid="hud-start-wave"
        @click="session.dispatch({ type: 'startWave' })"
      >
        <UiIcon name="play" :size="16" />
        {{ bonus > 0 ? t.hud.startWaveBonus.replace('{n}', String(bonus)) : t.hud.startWave }}
      </UiButton>
    </div>
    <div class="group">
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
        <UiIcon name="fast" :size="18" />
        x{{ session.speed }}
      </UiButton>
    </div>
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
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 14px 14px;
  isolation: isolate;
  pointer-events: auto;
}
/* фон отдельным слоем: клип по скосу не должен обрезать тост */
.hud::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 6%), transparent 50%),
    linear-gradient(180deg, rgb(32 38 27 / 95%), rgb(15 18 13 / 92%));
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 6px), calc(100% - 24px) 100%, 24px 100%, 0 calc(100% - 6px));
  box-shadow: inset 0 -2px 0 var(--c-brass);
}
.group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.center {
  flex: 1;
  justify-content: center;
}
.stat {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  box-sizing: border-box;
  background: rgb(0 0 0 / 40%);
  box-shadow: inset 0 0 0 1px rgb(184 154 82 / 35%);
  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
}
.cap {
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--c-muted);
}
.val {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 1.15rem;
  font-variant-numeric: tabular-nums;
}
.money {
  color: var(--c-accent);
}
.money .val {
  color: #ffd98a;
}
.hq {
  color: var(--c-ok);
  padding-bottom: 4px;
}
.hq .val {
  color: var(--c-text);
}
.hq.low {
  color: var(--c-danger);
}
.bar {
  position: absolute;
  left: 6px;
  right: 6px;
  bottom: 3px;
  height: 4px;
  background: rgb(0 0 0 / 60%);
}
.bar i {
  display: block;
  height: 100%;
  background: currentcolor;
  transition: width 0.3s var(--ease);
}
.wave {
  color: var(--c-sand);
}
.timer {
  color: var(--c-muted);
  font-size: 0.85rem;
}
.toast {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 10px;
  padding: 10px 20px;
  background: var(--c-danger);
  color: #fff;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 50%), 0 4px 12px rgb(0 0 0 / 50%);
  clip-path: polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
  animation: ui-pop-in 0.2s var(--ease);
}
</style>

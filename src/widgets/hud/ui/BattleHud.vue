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
const speedLabel = computed(() => t.hud.speed.replace('{n}', session.speed === 1 ? '2' : '1'))

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
watch(
  () => session.queuedOrders,
  (n) => {
    if (!n) return
    toast.value = t.build.orderQueued
    clearTimeout(timer)
    timer = setTimeout(() => (toast.value = ''), 1800)
  },
)
</script>

<template>
  <header class="hud">
    <div class="group">
      <div
        class="stat money"
        role="group"
        :title="t.hud.money"
        :aria-label="t.hud.money"
        data-testid="hud-money"
      >
        <UiIcon name="coin" :size="18" />
        <b class="val">{{ session.money }}</b>
      </div>
      <div
        class="stat hq"
        :class="{ low: hpPct <= 30 }"
        role="group"
        :title="t.hud.hq"
        :aria-label="t.hud.hq"
        data-testid="hud-hp"
      >
        <UiIcon name="shield" :size="18" />
        <b class="val">{{ session.hqHp }}/{{ HQ_HP }}</b>
        <i class="bar"><i :style="{ width: hpPct + '%' }" /></i>
      </div>
    </div>
    <div class="group center">
      <b class="val wave" data-testid="hud-wave">{{
        t.hud.wave
          .replace('{n}', String(session.waveNumber))
          .replace('{total}', String(session.waveTotal))
      }}</b>
      <span class="timer" data-testid="hud-timer">
        ·
        {{
          session.wavePhase === 'prep'
            ? t.hud.timerSec.replace('{n}', String(session.prepSecondsLeft))
            : t.hud.waveActive
        }}
      </span>
      <UiButton
        v-if="canStart"
        class="start"
        size="sm"
        data-testid="hud-start-wave"
        @click="session.dispatch({ type: 'startWave' })"
      >
        <UiIcon name="play" :size="14" />
        {{ t.hud.startWave }}
        <span v-if="bonus > 0" class="badge">+{{ bonus }}</span>
      </UiButton>
    </div>
    <div class="group">
      <UiButton
        class="icon-btn"
        variant="secondary"
        :aria-label="t.hud.pause"
        :title="t.hud.pause"
        data-testid="hud-pause"
        @click="session.paused = !session.paused"
      >
        <UiIcon name="pause" :size="16" />
      </UiButton>
      <UiButton
        class="icon-btn"
        variant="secondary"
        :aria-label="speedLabel"
        :title="speedLabel"
        :aria-pressed="session.speed !== 1"
        data-testid="hud-speed"
        @click="session.speed = session.speed === 1 ? 2 : 1"
      >
        <UiIcon name="fast" :size="16" />
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
  height: var(--hud-h);
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--pad);
  padding: 0 var(--pad);
  background: var(--panel-bg);
  border-bottom: var(--panel-border);
  pointer-events: auto;
}
.group {
  display: flex;
  align-items: center;
  gap: var(--pad);
}
.center {
  flex: 1;
  justify-content: center;
  gap: 4px;
}
.stat {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
}
.val {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: var(--fs-md);
  font-variant-numeric: tabular-nums;
}
.money {
  color: var(--c-accent);
}
.hq {
  color: var(--c-ok);
  padding-bottom: 5px;
}
.money .val,
.hq .val {
  color: var(--c-text);
}
.hq.low {
  color: var(--c-danger);
}
.bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
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
  font-size: var(--fs-sm);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.start {
  margin-left: var(--gap);
}
.badge {
  padding: 1px 5px;
  border-radius: var(--r);
  background: rgb(0 0 0 / 25%);
  font-size: var(--fs-xs);
}
.hud .icon-btn {
  position: relative;
  width: 2.25rem;
  min-width: 2.25rem;
  height: 2.25rem;
  min-height: 2.25rem;
  padding: 0;
}
/* увеличенная зона нажатия без роста вида кнопки */
.hud .icon-btn::after {
  content: '';
  position: absolute;
  inset: -4px;
}
.hud .start {
  min-height: 2rem;
  font-size: var(--fs-sm);
}
.icon-btn[aria-pressed='true'] {
  border-color: var(--c-accent);
  color: var(--c-accent);
}
@media (pointer: coarse) {
  .hud .icon-btn {
    width: var(--ui-h-touch);
    height: var(--ui-h-touch);
  }
  .hud .start {
    min-height: var(--ui-h-touch);
  }
}
.toast {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: var(--gap);
  padding: 6px 12px;
  background: var(--c-danger);
  color: #fff;
  font-size: var(--fs-sm);
  font-weight: 700;
  border-radius: var(--r-lg);
  animation: ui-pop-in 0.2s var(--ease);
}
</style>

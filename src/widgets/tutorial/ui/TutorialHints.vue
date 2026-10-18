<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useBattleSession } from '@/entities/battle'
import { useProgressStore } from '@/entities/progress'
import { t } from '@/shared/i18n'
import { UiButton } from '@/shared/ui'

const session = useBattleSession()
const progress = useProgressStore()
// 0 поставить башню, 1 начать волну, 2 улучшить, 3 посмотреть ранг
const step = ref(progress.tutorialDone ? -1 : 0)
const keys = ['place', 'wave', 'upgrade', 'rank'] as const
const text = computed(() => (step.value >= 0 ? t.tutorial[keys[step.value]!] : ''))

function finish() {
  step.value = -1
  progress.completeTutorial()
}

// переходы по событиям стора
watch(
  () => session.money,
  () => {
    if (step.value === 0 && (session.battle?.state.towers.length ?? 0) > 0) step.value = 1
  },
)
watch(
  () => session.wavePhase,
  (p) => {
    if (step.value === 1 && p === 'active') step.value = 2
  },
)
watch(
  () => session.selectedTower?.level,
  (l, prev) => {
    if (step.value === 2 && l && prev && l > prev) step.value = 3
  },
)
watch(
  () => session.selectedTower?.rank,
  (r) => {
    if (step.value === 3 && r) finish()
  },
)
</script>

<template>
  <div v-if="step >= 0" class="hint" role="status" data-testid="tutorial">
    <span>{{ text }}</span>
    <UiButton variant="secondary" data-testid="tutorial-skip" @click="finish">
      {{ t.tutorial.skip }}
    </UiButton>
  </div>
</template>

<style scoped>
.hint {
  position: absolute;
  top: calc(var(--safe-top) + 78px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 60vw;
  padding: 8px 12px;
  background: rgb(15 18 13 / 94%);
  box-shadow: inset 0 0 0 1px var(--c-accent);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
  animation: ui-pop-in 0.25s var(--ease);
  pointer-events: auto;
}
</style>

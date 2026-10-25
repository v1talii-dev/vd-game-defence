<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBattleSession } from '@/entities/battle'
import { LEVELS } from '@/entities/level'
import { useProgressStore } from '@/entities/progress'
import { t } from '@/shared/i18n'
import { UiButton, UiIcon, UiPanel } from '@/shared/ui'

const emit = defineEmits<{ restart: [] }>()
const session = useBattleSession()
const progress = useProgressStore()
const router = useRouter()

// следующий реализованный и открытый уровень кампании
const next = computed(() => {
  const i = LEVELS.findIndex((l) => l.id === session.levelId)
  const l = LEVELS[i + 1]
  return l?.implemented && progress.isUnlocked(l.id) ? l : null
})

watch(
  () => session.outcome,
  (o) => {
    if (o?.result === 'victory') progress.recordResult(session.levelId, o.stars, session.hqHp)
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="session.outcome" class="overlay">
    <UiPanel
      class="dialog"
      :class="session.outcome.result"
      role="dialog"
      aria-modal="true"
      data-testid="result-dialog"
    >
      <h2>{{ session.outcome.result === 'victory' ? t.result.victory : t.result.defeat }}</h2>
      <div
        v-if="session.outcome.result === 'victory'"
        class="stars"
        role="img"
        :aria-label="t.result.stars.replace('{n}', String(session.outcome.stars))"
      >
        <UiIcon
          v-for="i in 3"
          :key="i"
          :name="i <= session.outcome.stars ? 'star' : 'star-empty'"
          :size="36"
          :class="{ on: i <= session.outcome.stars }"
          :style="{ animationDelay: `${0.25 + i * 0.2}s` }"
        />
      </div>
      <div class="actions">
        <UiButton
          v-if="next && session.outcome.result === 'victory'"
          data-testid="result-next"
          @click="router.push(`/battle/${next.id}`)"
        >
          {{ t.result.next }}
        </UiButton>
        <UiButton
          :variant="next && session.outcome.result === 'victory' ? 'secondary' : 'primary'"
          data-testid="result-restart"
          @click="emit('restart')"
        >
          {{ t.result.restart }}
        </UiButton>
        <UiButton variant="secondary" data-testid="result-levels" @click="router.push('/campaign')">
          {{ t.result.toLevels }}
        </UiButton>
      </div>
    </UiPanel>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
  background: rgb(0 0 0 / 55%);
  animation: ui-fade-in 0.2s var(--ease);
  pointer-events: auto;
}
.dialog {
  width: min(300px, 90vw);
  max-height: calc(100dvh - var(--safe-top) - var(--safe-bottom) - 16px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px 20px 20px;
  text-align: center;
  animation: ui-pop-in 0.35s var(--ease);
}
h2 {
  margin: 0 0 10px;
  font-size: 1.5rem;
  color: var(--c-accent);
}
.defeat h2 {
  color: var(--c-danger);
}
.stars {
  display: flex;
  justify-content: center;
  gap: 8px;
  color: var(--c-steel-600);
}
.stars > * {
  animation: star-in 0.5s var(--ease) backwards;
}
.stars .on {
  color: var(--c-accent);
}
@keyframes star-in {
  from {
    opacity: 0;
    transform: scale(2.2) rotate(-25deg);
  }
}
.actions {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  margin-top: 14px;
}
</style>

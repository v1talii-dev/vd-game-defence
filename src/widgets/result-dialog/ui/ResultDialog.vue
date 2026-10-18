<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBattleSession } from '@/entities/battle'
import { useProgressStore } from '@/entities/progress'
import { t } from '@/shared/i18n'
import { UiButton, UiIcon } from '@/shared/ui'

const emit = defineEmits<{ restart: [] }>()
const session = useBattleSession()
const progress = useProgressStore()
const router = useRouter()

watch(
  () => session.outcome,
  (o) => {
    if (o?.result === 'victory') progress.recordResult('desert-base', o.stars, session.hqHp)
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="session.outcome" class="overlay">
    <div class="dialog" role="dialog" aria-modal="true" data-testid="result-dialog">
      <h2>{{ session.outcome.result === 'victory' ? t.result.victory : t.result.defeat }}</h2>
      <div v-if="session.outcome.result === 'victory'" class="stars">
        <UiIcon
          v-for="i in 3"
          :key="i"
          :name="i <= session.outcome.stars ? 'star' : 'star-empty'"
          :size="40"
        />
      </div>
      <div class="actions">
        <UiButton data-testid="result-restart" @click="emit('restart')">
          {{ t.result.restart }}
        </UiButton>
        <UiButton variant="secondary" data-testid="result-menu" @click="router.push('/')">
          {{ t.result.toMenu }}
        </UiButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 65%);
  pointer-events: auto;
}
.dialog {
  background: var(--c-bg);
  border: 2px solid var(--c-accent);
  border-radius: 6px;
  padding: 24px;
  text-align: center;
}
h2 {
  margin: 0 0 12px;
  color: var(--c-sand);
}
.stars {
  color: var(--c-accent);
}
.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
}
</style>

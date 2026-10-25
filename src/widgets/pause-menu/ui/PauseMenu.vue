<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBattleSession } from '@/entities/battle'
import { t } from '@/shared/i18n'
import { UiButton, UiPanel } from '@/shared/ui'

const emit = defineEmits<{ restart: [] }>()
const session = useBattleSession()
const router = useRouter()
const confirmExit = ref(false)

// автопауза при уходе со вкладки или потере фокуса
const autoPause = () => (session.paused = true)
const onVisibility = () => document.hidden && autoPause()
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('blur', autoPause)
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('blur', autoPause)
})
</script>

<template>
  <div v-if="session.paused && !session.outcome" class="overlay">
    <UiPanel class="menu" role="dialog" aria-modal="true" data-testid="pause-menu">
      <h2>{{ t.pause.title }}</h2>
      <UiButton data-testid="pause-resume" @click="session.paused = false">
        {{ t.pause.resume }}
      </UiButton>
      <UiButton variant="secondary" data-testid="pause-restart" @click="emit('restart')">
        {{ t.pause.restart }}
      </UiButton>
      <UiButton variant="secondary" @click="router.push('/settings')">
        {{ t.pause.settings }}
      </UiButton>
      <div v-if="confirmExit" class="confirm" role="alertdialog" data-testid="pause-exit-confirm">
        <span>{{ t.pause.exitInline }}</span>
        <UiButton variant="danger" data-testid="pause-exit-yes" @click="router.push('/')">
          {{ t.common.yes }}
        </UiButton>
        <UiButton variant="secondary" data-testid="pause-exit-no" @click="confirmExit = false">
          {{ t.common.no }}
        </UiButton>
      </div>
      <UiButton v-else variant="secondary" data-testid="pause-exit" @click="confirmExit = true">
        {{ t.pause.exit }}
      </UiButton>
    </UiPanel>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
  background: rgb(0 0 0 / 55%);
  animation: ui-fade-in 0.2s var(--ease);
  pointer-events: auto;
}
.menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(260px, 90vw);
  max-height: calc(100dvh - var(--safe-top) - var(--safe-bottom) - 16px);
  overflow-y: auto;
  overscroll-behavior: contain;
  animation: ui-pop-in 0.25s var(--ease);
}
h2 {
  margin: 0 0 4px;
  font-size: var(--fs-lg);
  text-align: center;
  color: var(--c-accent);
}
.menu :deep(.btn) {
  min-height: max(36px, var(--ui-h));
}
.confirm {
  display: flex;
  align-items: center;
  gap: 8px;
}
.confirm span {
  flex: 1;
}
</style>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBattleSession } from '@/entities/battle'
import { t } from '@/shared/i18n'
import { UiButton, UiDialog, UiPanel } from '@/shared/ui'

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
      <UiButton variant="secondary" data-testid="pause-exit" @click="confirmExit = true">
        {{ t.pause.exit }}
      </UiButton>
    </UiPanel>
    <UiDialog
      v-if="confirmExit"
      :title="t.pause.exitConfirmTitle"
      :message="t.pause.exitConfirmMessage"
      :confirm-label="t.common.confirm"
      :cancel-label="t.common.cancel"
      @confirm="router.push('/')"
      @cancel="confirmExit = false"
    />
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  background: radial-gradient(ellipse at center, rgb(0 0 0 / 55%), rgb(0 0 0 / 82%));
  animation: ui-fade-in 0.2s var(--ease);
  pointer-events: auto;
}
.menu {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 300px;
  animation: ui-pop-in 0.25s var(--ease);
}
h2 {
  margin: 0 0 6px;
  text-align: center;
  color: var(--c-accent);
  text-transform: uppercase;
}
</style>

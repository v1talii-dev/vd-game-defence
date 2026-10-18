<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBattleSession } from '@/entities/battle'
import { t } from '@/shared/i18n'
import { UiButton, UiDialog } from '@/shared/ui'

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
    <div class="menu" role="dialog" aria-modal="true" data-testid="pause-menu">
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
    </div>
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
  background: rgb(0 0 0 / 65%);
  pointer-events: auto;
}
.menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 240px;
  padding: 20px;
  background: var(--c-bg);
  border: 2px solid var(--c-accent);
  border-radius: 6px;
}
h2 {
  margin: 0;
  color: var(--c-sand);
}
</style>

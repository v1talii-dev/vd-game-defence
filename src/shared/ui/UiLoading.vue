<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { t } from '@/shared/i18n'

// Показывается, только если загрузка дольше DELAY_MS (без мигания на быстрой загрузке)
const DELAY_MS = 200

const props = defineProps<{ active: boolean }>()
const shown = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.active,
  (on) => {
    clearTimeout(timer)
    if (on) timer = setTimeout(() => (shown.value = true), DELAY_MS)
    else shown.value = false
  },
  { immediate: true },
)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <Transition name="loading">
    <div v-if="shown" class="loading" data-testid="loading-screen" role="status" aria-live="polite">
      <h1 class="name">{{ t.title }}</h1>
      <div class="bar"><div class="fill" /></div>
      <p class="text">{{ t.loading.text }}</p>
    </div>
  </Transition>
</template>

<style scoped>
.loading {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--pad);
  padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
  color: var(--c-text);
  background: var(--c-bg);
}
.name {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  color: var(--c-accent);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.bar {
  width: min(16rem, 60vw);
  height: 6px;
  overflow: hidden;
  background: var(--panel-bg);
  border: var(--panel-border);
  border-radius: var(--r);
}
.fill {
  width: 40%;
  height: 100%;
  background: var(--c-accent);
  animation: slide 1.1s var(--ease) infinite;
}
.text {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--c-muted);
}
.loading-leave-active {
  pointer-events: none;
  transition: opacity 0.25s var(--ease);
}
.loading-leave-to {
  opacity: 0;
}
@keyframes slide {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(250%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .fill {
    width: 100%;
    animation: none;
  }
}
</style>

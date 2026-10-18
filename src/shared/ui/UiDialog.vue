<script setup lang="ts">
import UiButton from './UiButton.vue'

defineProps<{ title: string; message?: string; confirmLabel: string; cancelLabel: string }>()
defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div class="overlay" @click.self="$emit('cancel')" @keydown.esc="$emit('cancel')">
    <div class="dialog" role="dialog" aria-modal="true" :aria-label="title">
      <h2>{{ title }}</h2>
      <p v-if="message">{{ message }}</p>
      <slot />
      <div class="actions">
        <UiButton variant="secondary" @click="$emit('cancel')">{{ cancelLabel }}</UiButton>
        <UiButton @click="$emit('confirm')">{{ confirmLabel }}</UiButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 65%);
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
    env(safe-area-inset-left);
}
.dialog {
  background: var(--c-bg);
  border: 2px solid var(--c-accent);
  border-radius: 6px;
  padding: 20px;
  max-width: min(420px, 90vw);
}
h2 {
  margin: 0 0 8px;
  color: var(--c-sand);
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}
</style>

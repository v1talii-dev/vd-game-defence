<script setup lang="ts">
import UiButton from './UiButton.vue'
import UiPanel from './UiPanel.vue'

defineProps<{ title: string; message?: string; confirmLabel: string; cancelLabel: string }>()
defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div class="overlay" @click.self="$emit('cancel')" @keydown.esc="$emit('cancel')">
    <UiPanel class="dialog" role="dialog" aria-modal="true" :aria-label="title">
      <h2>{{ title }}</h2>
      <p v-if="message">{{ message }}</p>
      <slot />
      <div class="actions">
        <UiButton variant="secondary" @click="$emit('cancel')">{{ cancelLabel }}</UiButton>
        <UiButton @click="$emit('confirm')">{{ confirmLabel }}</UiButton>
      </div>
    </UiPanel>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  background: radial-gradient(ellipse at center, rgb(0 0 0 / 55%), rgb(0 0 0 / 82%));
  animation: ui-fade-in 0.2s var(--ease);
}
.dialog {
  max-width: min(440px, 90vw);
  animation: ui-pop-in 0.25s var(--ease);
}
h2 {
  margin: 0 0 8px;
  color: var(--c-accent);
  text-transform: uppercase;
}
p {
  margin: 0;
  color: var(--c-muted);
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>

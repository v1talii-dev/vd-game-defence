<script setup lang="ts">
import { RouterLink } from 'vue-router'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    type?: 'button' | 'submit'
    /** маршрут: кнопка рендерится ссылкой (для навигации) */
    to?: string
  }>(),
  { variant: 'primary', size: 'md', type: 'button', to: undefined },
)
</script>

<template>
  <component
    :is="to ? RouterLink : 'button'"
    class="btn"
    :class="[variant, size]"
    v-bind="to ? { to } : { type, disabled }"
  >
    <slot />
  </component>
</template>

<style scoped>
.btn {
  --bg: var(--c-steel-700);
  --bg-hover: var(--c-steel-600);
  --bd: rgb(184 154 82 / 35%);
  --ink: var(--c-text);
  box-sizing: border-box;
  min-width: var(--ui-h);
  min-height: var(--ui-h);
  padding: 0 16px;
  border: var(--bw) solid var(--bd);
  border-radius: var(--r);
  background: var(--bg);
  color: var(--ink);
  font: 700 var(--fs-md) / 1 var(--font-body);
  text-decoration: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--gap);
  transition:
    background-color 0.15s var(--ease),
    border-color 0.15s var(--ease);
}
.primary {
  --bg: var(--c-accent);
  --bg-hover: #f7b95c;
  --bd: var(--c-accent);
  --ink: #1d1409;
}
.danger {
  --bd: var(--c-danger);
  --bg-hover: #4a2a22;
}
.sm {
  min-height: var(--ui-h);
  padding: 0 10px;
  font-size: var(--fs-sm);
}
.lg {
  min-height: var(--ui-h-touch);
  padding: 0 32px;
  font-size: var(--fs-lg);
  font-family: var(--font-display);
  font-weight: 400;
}
@media (pointer: coarse) {
  .sm {
    min-height: var(--ui-h-touch);
  }
}
.btn:hover:not(:disabled) {
  background: var(--bg-hover);
}
.btn:active:not(:disabled) {
  transform: translateY(1px);
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn:focus-visible {
  outline: 2px solid var(--c-accent);
  outline-offset: 2px;
}
</style>

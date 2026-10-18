<script setup lang="ts">
import { RouterLink } from 'vue-router'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger'
    size?: 'md' | 'lg'
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
  --edge: 8px;
  --top: var(--c-olive-bright);
  --mid: var(--c-olive);
  --bot: #34401d;
  --ink: #f6f3e2;
  position: relative;
  box-sizing: border-box;
  min-width: 44px;
  min-height: 44px;
  padding: 0 22px;
  border: 0;
  /* фаски по двум противоположным углам */
  clip-path: polygon(
    var(--edge) 0,
    100% 0,
    100% calc(100% - var(--edge)),
    calc(100% - var(--edge)) 100%,
    0 100%,
    0 var(--edge)
  );
  background: linear-gradient(180deg, var(--top) 0%, var(--mid) 45%, var(--bot) 100%);
  box-shadow:
    inset 0 0 0 1px rgb(0 0 0 / 55%),
    inset 0 2px 0 rgb(255 255 255 / 28%),
    inset 0 -3px 0 rgb(0 0 0 / 28%);
  color: var(--ink);
  font: 700 0.95rem/1 var(--font-body);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-decoration: none;
  text-shadow: 0 1px 2px rgb(0 0 0 / 70%);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition:
    filter 0.15s var(--ease),
    transform 0.1s var(--ease);
}
.primary {
  --top: #ffc765;
  --mid: var(--c-accent);
  --bot: var(--c-accent-dark);
  --ink: #1d1409;
  text-shadow: 0 1px 0 rgb(255 255 255 / 35%);
}
.secondary {
  --top: #4d5a42;
  --mid: var(--c-steel-600);
  --bot: var(--c-steel-800);
  --ink: var(--c-sand);
}
.danger {
  --top: #e5674c;
  --mid: var(--c-danger);
  --bot: #7e2616;
}
.lg {
  min-height: 56px;
  padding: 0 40px;
  font-size: 1.15rem;
  font-family: var(--font-display);
  font-weight: 400;
}
.btn:hover:not(:disabled) {
  filter: brightness(1.15) saturate(1.1);
}
.btn:active:not(:disabled) {
  transform: translateY(1px);
  filter: brightness(0.9);
}
.btn:disabled {
  filter: grayscale(0.9) brightness(0.65);
  cursor: not-allowed;
}
.btn:focus-visible {
  outline: 2px solid var(--c-text);
  outline-offset: -4px;
}
</style>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary'
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', type: 'button' },
)
</script>

<template>
  <button class="btn" :class="variant" :type="type" :disabled="disabled">
    <slot />
  </button>
</template>

<style scoped>
.btn {
  min-width: 44px;
  min-height: 44px;
  padding: 0 20px;
  border: 2px solid var(--c-accent);
  border-radius: 4px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.primary {
  background: var(--c-accent);
  color: var(--c-bg);
}
.secondary {
  background: transparent;
  color: var(--c-sand);
  border-color: var(--c-sand);
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn:focus-visible {
  outline: 3px solid var(--c-text);
  outline-offset: 2px;
}
</style>

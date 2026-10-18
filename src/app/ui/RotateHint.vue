<script setup lang="ts">
import { t } from '@/shared/i18n'
</script>

<template>
  <div class="rotate" role="alert">{{ t.rotate.hint }}</div>
</template>

<style scoped>
.rotate {
  display: none;
}
/* только сенсорные устройства: узкое окно десктопа не блокируем */
@media (orientation: portrait) and (pointer: coarse) {
  .rotate {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    padding: 24px;
    text-align: center;
    font-size: 1.4rem;
    background: var(--c-bg);
    color: var(--c-accent);
    font-family: var(--font-display);
  }
}
</style>

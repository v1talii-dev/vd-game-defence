<script setup lang="ts">
// Простые встроенные SVG, ассеты не нужны
withDefaults(defineProps<{ name: 'star' | 'star-empty' | 'close' | 'pause'; size?: number }>(), {
  size: 24,
})

const paths = {
  star: 'M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z',
  'star-empty': 'M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z',
  close: 'M5 5l14 14M19 5L5 19',
  pause: 'M7 4v16M17 4v16',
}
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    aria-hidden="true"
    :fill="name === 'star' ? 'currentColor' : 'none'"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path :d="paths[name]" />
  </svg>
</template>

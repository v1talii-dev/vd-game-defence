<script setup lang="ts">
// Собственные иконки (рисунки проекта, CC0), вставляются как статичная разметка
import { computed } from 'vue'

export type IconName =
  | 'star'
  | 'star-empty'
  | 'close'
  | 'check'
  | 'pause'
  | 'play'
  | 'fast'
  | 'coin'
  | 'shield'
  | 'wave'
  | 'clock'
  | 'machineGun'
  | 'rocket'
  | 'upgrade'
  | 'sell'
  | 'damage'
  | 'rate'
  | 'range'
  | 'chevron'

const props = withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 24 })

const STAR = '<path d="M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z"/>'
const icons: Record<IconName, string> = {
  star: STAR,
  'star-empty': STAR.replace('<path', '<path fill="none" stroke="currentColor" stroke-width="2"'),
  close:
    '<path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  pause: '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  fast: '<path d="M3 5l9 7-9 7zM12 5l9 7-9 7z"/>',
  coin: '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 3a7 7 0 110 14 7 7 0 010-14zm-1 3v1.2c-1.300.3-2 1.100-2 2 0 1.200 1 1.700 2.400 2.100 1 .3 1.200.5 1.200.9 0 .4-.4.7-1.100.7-.8 0-1.300-.3-1.500-.9l-1.600.5c.3 1 1.200 1.600 2.300 1.800V17h1.400v-1.200c1.400-.3 2.100-1.100 2.100-2.100 0-1.300-1.100-1.800-2.400-2.200-.9-.3-1.200-.4-1.200-.8 0-.3.300-.6 1-.6s1.100.3 1.300.7l1.500-.5c-.3-.8-1-1.300-1.900-1.500V8z"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.400 9.300-8 11-4.600-1.700-8-6-8-11V5zm0 4l-4 1.500V11c0 2.800 1.700 5.300 4 6.500 2.300-1.200 4-3.700 4-6.500V7.500z"/>',
  wave: '<path d="M4 3h2v18H4zM7 4h12l-3 4.500L19 13H7z"/>',
  clock: '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 3a7 7 0 110 14 7 7 0 010-14zm-1 2v5.400l3.800 2.200.8-1.300-3-1.800V7z"/>',
  machineGun:
    '<path d="M3 18h18l-2 3H5zM10.500 15h3v2.500h-3zM8 8h8v6H8zM16 10h5v2h-5zM21 9h2v4h-2zM3 9h4v5H3zM7 10.500h1v2H7z"/>',
  rocket:
    '<path d="M3 20h18v2H3zM9.500 17h5v2.500h-5z"/><g transform="translate(1 4.500) rotate(-28 11 9) scale(.88)"><path fill-rule="evenodd" d="M3 2h16v4H3zM3 7h16v4H3zM3 12h16v4H3zM15.500 4a1.500 1.500 0 103 0 1.500 1.500 0 10-3 0zM15.500 9a1.500 1.500 0 103 0 1.500 1.500 0 10-3 0zM15.500 14a1.500 1.500 0 103 0 1.500 1.500 0 10-3 0z"/></g>',
  upgrade: '<path d="M12 3l8 9h-5v9H9v-9H4z"/>',
  sell: '<path d="M3 6h18v3H3zM5 10h14v11H5zm4 3v5h2v-5zm4 0v5h2v-5z"/>',
  damage: '<path d="M12 1l2.500 6.500L21 6l-3.500 5.500L23 14l-6.500 1L15 22l-3-5-3 5-1.500-7L1 14l5.500-2.500L3 6l6.500 1.500z"/>',
  rate: '<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
  range: '<path d="M12 4a8 8 0 100 16 8 8 0 000-16zm0 3a5 5 0 110 10 5 5 0 010-10zm0 3a2 2 0 100 4 2 2 0 000-4zM11 0h2v4h-2zm0 20h2v4h-2zM0 11h4v2H0zm20 0h4v2h-4z"/>',
  check:
    '<path d="M4 12.5l5 5L20 6.500" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round" stroke-linejoin="round"/>',
  chevron: '<path d="M12 5l8 7h-4.500L12 9 8.500 12H4zM12 12l8 7h-4.500L12 16l-3.500 3H4z"/>',
}
const markup = computed(() => icons[props.name])
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- статичные константы выше, пользовательского ввода нет -->
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="currentColor"
    class="ui-icon"
    v-html="markup"
  />
</template>

<style scoped>
.ui-icon {
  flex: none;
}
</style>

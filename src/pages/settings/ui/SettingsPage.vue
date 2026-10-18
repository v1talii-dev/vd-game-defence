<script setup lang="ts">
import { useProgressStore } from '@/entities/progress'
import { t } from '@/shared/i18n'
import { UiButton, UiPanel } from '@/shared/ui'

const progress = useProgressStore()
</script>

<template>
  <main class="page">
    <UiPanel class="panel">
      <h1>{{ t.settings.title }}</h1>
      <label class="row">
        <span>{{ t.settings.volume }}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="progress.settings.volume"
          @input="
            progress.updateSettings({ volume: Number(($event.target as HTMLInputElement).value) })
          "
        />
      </label>
      <label class="row">
        <span>{{ t.settings.sfx }}</span>
        <input
          type="checkbox"
          :checked="progress.settings.sfx"
          @change="progress.updateSettings({ sfx: ($event.target as HTMLInputElement).checked })"
        />
      </label>
      <label class="row">
        <span>{{ t.settings.showRanges }}</span>
        <input
          type="checkbox"
          :checked="progress.settings.showRanges"
          @change="
            progress.updateSettings({ showRanges: ($event.target as HTMLInputElement).checked })
          "
        />
      </label>
      <UiButton to="/" variant="secondary" class="back">{{ t.settings.back }}</UiButton>
    </UiPanel>
  </main>
</template>

<style scoped>
.page {
  height: 100%;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
  box-sizing: border-box;
  background:
    radial-gradient(ellipse at center, transparent 35%, rgb(0 0 0 / 80%) 100%),
    repeating-linear-gradient(0deg, transparent 0 47px, rgb(184 154 82 / 6%) 47px 48px),
    repeating-linear-gradient(90deg, transparent 0 47px, rgb(184 154 82 / 6%) 47px 48px),
    linear-gradient(180deg, #151a11, var(--c-bg));
}
.panel {
  width: min(440px, 90vw);
  animation: ui-pop-in 0.3s var(--ease);
}
h1 {
  margin: 0 0 12px;
  color: var(--c-accent);
  text-transform: uppercase;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 48px;
  border-bottom: 1px solid rgb(184 154 82 / 18%);
  cursor: pointer;
}
.row input[type='checkbox'] {
  appearance: none;
  position: relative;
  width: 48px;
  height: 24px;
  margin: 0;
  background: var(--c-steel-900);
  box-shadow: inset 0 0 0 1px var(--c-brass);
  cursor: pointer;
  transition: background 0.15s var(--ease);
}
.row input[type='checkbox']::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  background: var(--c-muted);
  transition:
    transform 0.15s var(--ease),
    background 0.15s var(--ease);
}
.row input[type='checkbox']:checked {
  background: var(--c-olive);
}
.row input[type='checkbox']:checked::after {
  transform: translateX(24px);
  background: var(--c-accent);
}
.row input[type='range'] {
  width: 180px;
  accent-color: var(--c-accent);
  cursor: pointer;
}
input:focus-visible {
  outline: 2px solid var(--c-text);
  outline-offset: 2px;
}
.back {
  margin-top: 20px;
  width: 100%;
}
</style>

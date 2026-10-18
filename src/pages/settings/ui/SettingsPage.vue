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
      <RouterLink v-slot="{ navigate }" to="/" custom>
        <UiButton variant="secondary" @click="navigate">{{ t.settings.back }}</UiButton>
      </RouterLink>
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
}
.panel {
  width: min(420px, 90vw);
}
h1 {
  margin: 0 0 12px;
  color: var(--c-sand);
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 44px;
}
.row input {
  min-width: 24px;
  min-height: 24px;
  accent-color: var(--c-accent);
}
</style>

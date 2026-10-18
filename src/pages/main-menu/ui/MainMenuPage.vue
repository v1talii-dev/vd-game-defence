<script setup lang="ts">
import { ref } from 'vue'
import { useProgressStore } from '@/entities/progress'
import { t } from '@/shared/i18n'
import { UiButton, UiIcon } from '@/shared/ui'

const progress = useProgressStore()
const stars = progress.levels['desert-base']?.stars ?? 0
// предупреждение показываем один раз за сессию, пока пользователь не закроет
const warn = ref(!progress.storageAvailable)
</script>

<template>
  <main class="menu">
    <h1>{{ t.title }}</h1>
    <div class="stars" role="img" :aria-label="t.menu.starsLabel.replace('{n}', String(stars))">
      <UiIcon v-for="i in 3" :key="i" :name="i <= stars ? 'star' : 'star-empty'" :size="32" />
    </div>
    <p class="best">{{ t.menu.bestResult }}</p>
    <RouterLink class="play" to="/battle">{{ t.menu.play }}</RouterLink>
    <RouterLink v-slot="{ navigate }" to="/settings" custom>
      <UiButton variant="secondary" @click="navigate">{{ t.menu.settings }}</UiButton>
    </RouterLink>
    <div v-if="warn" class="warn" role="status">
      {{ t.menu.storageWarning }}
      <UiButton variant="secondary" @click="warn = false">{{ t.menu.dismiss }}</UiButton>
    </div>
  </main>
</template>

<style scoped>
.menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
  box-sizing: border-box;
  background:
    repeating-linear-gradient(45deg, transparent 0 24px, rgb(201 168 106 / 4%) 24px 25px),
    radial-gradient(ellipse at 50% 100%, rgb(217 130 43 / 18%), transparent 60%), var(--c-bg);
}
h1 {
  margin: 0;
  color: var(--c-sand);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-shadow: 0 2px 0 var(--c-accent);
}
.stars {
  display: flex;
  gap: 4px;
  color: var(--c-accent);
}
.best {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.7;
}
.play {
  min-width: 160px;
  min-height: 44px;
  display: grid;
  place-items: center;
  background: var(--c-accent);
  color: var(--c-bg);
  font-weight: 700;
  text-decoration: none;
  border-radius: 4px;
}
.warn {
  position: absolute;
  bottom: calc(var(--safe-bottom) + 12px);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid var(--c-accent);
  border-radius: 4px;
  font-size: 0.85rem;
}
</style>

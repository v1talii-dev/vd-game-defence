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
    <div class="art" aria-hidden="true" />
    <section class="card">
      <UiIcon name="shield" :size="64" class="emblem" />
      <h1>{{ t.title }}</h1>
      <p class="tagline">{{ t.menu.tagline }}</p>
      <div class="best">
        <div class="stars" role="img" :aria-label="t.menu.starsLabel.replace('{n}', String(stars))">
          <UiIcon
            v-for="i in 3"
            :key="i"
            :name="i <= stars ? 'star' : 'star-empty'"
            :size="30"
            :class="{ on: i <= stars }"
          />
        </div>
        <span>{{ t.menu.bestResult }}</span>
      </div>
      <nav class="actions">
        <UiButton to="/battle" size="lg">{{ t.menu.play }}</UiButton>
        <UiButton to="/settings" variant="secondary" size="lg">{{ t.menu.settings }}</UiButton>
      </nav>
    </section>
    <div v-if="warn" class="warn" role="status">
      {{ t.menu.storageWarning }}
      <UiButton variant="secondary" @click="warn = false">{{ t.menu.dismiss }}</UiButton>
    </div>
  </main>
</template>

<style scoped>
.menu {
  position: relative;
  display: grid;
  place-items: center;
  height: 100%;
  padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
  box-sizing: border-box;
  overflow: hidden;
}
/* камуфляжные пятна, сетка и виньетка */
.art {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at center, transparent 35%, rgb(0 0 0 / 80%) 100%),
    repeating-linear-gradient(0deg, transparent 0 47px, rgb(184 154 82 / 6%) 47px 48px),
    repeating-linear-gradient(90deg, transparent 0 47px, rgb(184 154 82 / 6%) 47px 48px),
    radial-gradient(ellipse 40% 30% at 20% 30%, rgb(90 107 52 / 35%), transparent),
    radial-gradient(ellipse 35% 35% at 80% 70%, rgb(90 107 52 / 30%), transparent),
    radial-gradient(ellipse 50% 25% at 60% 100%, rgb(240 166 58 / 22%), transparent),
    linear-gradient(180deg, #151a11, var(--c-bg));
}
.card {
  --edge: 22px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: min(460px, 90vw);
  padding: 36px 40px 40px;
  box-sizing: border-box;
  clip-path: polygon(
    var(--edge) 0,
    100% 0,
    100% calc(100% - var(--edge)),
    calc(100% - var(--edge)) 100%,
    0 100%,
    0 var(--edge)
  );
  background:
    linear-gradient(180deg, rgb(255 255 255 / 6%), transparent 35%),
    linear-gradient(160deg, rgb(44 52 36 / 94%), rgb(18 22 15 / 96%));
  box-shadow:
    inset 0 0 0 2px var(--c-brass),
    inset 0 0 0 3px rgb(0 0 0 / 65%),
    inset 0 0 60px rgb(0 0 0 / 50%);
  animation: ui-pop-in 0.5s var(--ease);
}
.emblem {
  color: var(--c-accent);
  filter: drop-shadow(0 0 12px rgb(240 166 58 / 45%));
}
h1 {
  margin: 0;
  font-size: 2.6rem;
  line-height: 1.05;
  text-align: center;
  text-transform: uppercase;
  background: linear-gradient(180deg, #fff3cf 0%, var(--c-accent) 55%, var(--c-accent-dark) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 3px 0 rgb(0 0 0 / 70%));
}
.tagline {
  margin: 0;
  color: var(--c-muted);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-size: 0.8rem;
}
.best {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin: 10px 0 6px;
  padding: 10px 24px;
  background: rgb(0 0 0 / 35%);
  border-block: 1px solid rgb(184 154 82 / 35%);
  font-size: 0.8rem;
  color: var(--c-muted);
}
.stars {
  display: flex;
  gap: 6px;
  color: var(--c-steel-600);
}
.stars .on {
  color: var(--c-accent);
  filter: drop-shadow(0 0 6px rgb(240 166 58 / 60%));
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.warn {
  position: absolute;
  bottom: calc(var(--safe-bottom) + 16px);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: rgb(15 18 13 / 92%);
  border: 1px solid var(--c-accent);
  font-size: 0.85rem;
}
</style>

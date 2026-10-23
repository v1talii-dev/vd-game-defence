<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { LEVELS, type LevelConfig } from '@/entities/level'
import { useProgressStore } from '@/entities/progress'
import { t, tr } from '@/shared/i18n'
import { UiButton, UiIcon, UiPanel } from '@/shared/ui'

const progress = useProgressStore()
const route = useRoute()
// выбранный уровень = предбоевой экран
const selected = ref<LevelConfig | null>(null)

const fmt = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k]))
const starsOf = (l: LevelConfig) => progress.levels[l.id]?.stars ?? 0
const isLocked = (l: LevelConfig) => !progress.isUnlocked(l.id)
const isPlayable = (l: LevelConfig) => !isLocked(l) && l.implemented
// «Пройдите уровень N» — номер уровня из requires
const requiredNum = (l: LevelConfig) => LEVELS.findIndex((x) => x.id === l.requires?.levelId) + 1

// башня «новая», пока уровень не пройден, если её открыл один из предыдущих уровней
const newTowers = computed(() => {
  const l = selected.value
  if (!l || starsOf(l) > 0) return new Set<string>()
  const earlier = LEVELS.slice(0, LEVELS.indexOf(l)).flatMap((x) => x.unlocks)
  return new Set(l.allowedTowers.filter((x) => earlier.includes(x)))
})
</script>

<template>
  <main class="campaign">
    <header class="bar">
      <UiButton
        v-if="selected"
        variant="secondary"
        data-testid="level-back"
        @click="selected = null"
      >
        {{ t.campaign.back }}
      </UiButton>
      <UiButton v-else to="/" variant="secondary" data-testid="campaign-back">
        {{ t.campaign.back }}
      </UiButton>
      <h1>{{ selected ? tr(selected.name) : t.campaign.title }}</h1>
    </header>

    <p v-if="route.query.locked && !selected" class="notice" role="status">
      {{ t.campaign.lockedRedirect }}
    </p>

    <ul v-if="!selected" class="list" data-testid="level-list">
      <li v-for="(l, i) in LEVELS" :key="l.id">
        <button
          class="card"
          :class="{ locked: isLocked(l), done: starsOf(l) > 0 }"
          :disabled="!isPlayable(l)"
          :aria-label="fmt(t.campaign.open, { name: tr(l.name) })"
          :data-testid="`level-card-${l.id}`"
          @click="selected = l"
        >
          <span class="num">{{ i + 1 }}</span>
          <span class="info">
            <b class="name">{{ tr(l.name) }}</b>
            <span v-if="isLocked(l)" class="sub">
              {{ fmt(t.campaign.requires, { n: requiredNum(l) }) }}
            </span>
            <span v-else-if="!l.implemented" class="sub">{{ t.campaign.soon }}</span>
            <span v-else-if="progress.levels[l.id]" class="sub">
              {{ fmt(t.campaign.bestHp, { n: progress.levels[l.id]!.bestHp }) }}
            </span>
          </span>
          <UiIcon v-if="isLocked(l)" name="lock" :size="24" class="lock" />
          <span
            v-else
            class="stars"
            role="img"
            :aria-label="fmt(t.campaign.stars, { n: starsOf(l) })"
            :data-stars="starsOf(l)"
          >
            <UiIcon
              v-for="s in 3"
              :key="s"
              :name="s <= starsOf(l) ? 'star' : 'star-empty'"
              :size="22"
              :class="{ on: s <= starsOf(l) }"
            />
          </span>
        </button>
      </li>
    </ul>

    <UiPanel v-else class="brief" data-testid="level-briefing-screen">
      <section>
        <h2>{{ t.campaign.briefing }}</h2>
        <p v-for="k in selected.briefing" :key="k" data-testid="level-briefing">{{ tr(k) }}</p>
      </section>
      <section>
        <h2>{{ t.campaign.towers }}</h2>
        <ul class="towers">
          <li
            v-for="tw in selected.allowedTowers"
            :key="tw"
            :class="{ fresh: newTowers.has(tw) }"
            :data-testid="`level-tower-${tw}`"
          >
            <UiIcon :name="tw" :size="32" />
            <span>{{ t.towers[tw] }}</span>
            <em v-if="newTowers.has(tw)" class="badge">{{ t.campaign.newTower }}</em>
          </li>
        </ul>
        <UiButton size="lg" :to="`/battle/${selected.id}`" data-testid="level-start">
          {{ t.campaign.start }}
        </UiButton>
      </section>
    </UiPanel>
  </main>
</template>

<style scoped>
.campaign {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  height: 100%;
  padding: calc(var(--safe-top) + 12px) calc(var(--safe-right) + 16px)
    calc(var(--safe-bottom) + 12px) calc(var(--safe-left) + 16px);
  box-sizing: border-box;
  overflow-y: auto;
  background: linear-gradient(180deg, #151a11, var(--c-bg));
}
.bar {
  display: flex;
  align-items: center;
  gap: 12px;
  width: min(640px, 100%);
}
h1 {
  margin: 0;
  font: 400 var(--fs-lg) / 1.1 var(--font-display);
  color: var(--c-accent);
  text-transform: uppercase;
}
h2 {
  margin: 0 0 6px;
  font-size: var(--fs-md);
  color: var(--c-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.notice {
  margin: 0;
  padding: 6px 12px;
  border: 1px solid var(--c-accent);
  border-radius: var(--r);
  font-size: var(--fs-sm);
}
.list,
.towers {
  list-style: none;
  margin: 0;
  padding: 0;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(640px, 100%);
}
.card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  padding: 8px 14px;
  box-sizing: border-box;
  font: inherit;
  text-align: left;
  color: var(--c-text);
  background: var(--panel-bg);
  border: var(--panel-border);
  border-radius: var(--r);
  cursor: pointer;
}
.card:hover:not(:disabled) {
  border-color: var(--c-accent);
}
.card:focus-visible {
  outline: 2px solid var(--c-accent);
  outline-offset: 2px;
}
.card:disabled {
  cursor: not-allowed;
}
.card.locked {
  opacity: 0.55;
}
.num {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--c-steel-700);
  font-weight: 700;
}
.done .num {
  background: var(--c-accent);
  color: #1d1409;
}
.info {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 2px;
  min-width: 0;
}
.sub {
  font-size: var(--fs-sm);
  color: var(--c-muted);
}
.stars {
  display: flex;
  gap: 2px;
  color: var(--c-steel-600);
}
.stars .on {
  color: var(--c-accent);
}
.lock {
  color: var(--c-muted);
}
.brief {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  width: min(640px, 100%);
  padding: 14px 18px;
  box-sizing: border-box;
}
.brief p {
  margin: 0 0 6px;
  line-height: 1.35;
}
.towers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.towers li {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 4px 10px;
  background: var(--c-steel-700);
  border: 2px solid transparent;
  border-radius: var(--r);
  color: var(--c-sand);
}
.towers li.fresh {
  border-color: var(--c-accent);
  animation: fresh-pulse 1.4s ease-in-out infinite alternate;
}
.badge {
  font: 700 var(--fs-xs) / 1 var(--font-body);
  font-style: normal;
  color: var(--c-accent);
  text-transform: uppercase;
}
@keyframes fresh-pulse {
  to {
    box-shadow: 0 0 10px rgb(240 166 58 / 60%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .towers li.fresh {
    animation: none;
  }
}
@media (max-width: 560px) {
  .brief {
    grid-template-columns: 1fr;
  }
}
</style>

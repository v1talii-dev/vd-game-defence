<script setup lang="ts">
import { computed } from 'vue'
import { useBattleSession } from '@/entities/battle'
import { RANKS, sellRefund, towerStats, upgradeCost, type TargetPriority } from '@/entities/tower'
import { TICK_RATE } from '@/shared/config'
import { t } from '@/shared/i18n'
import { UiButton, UiIcon } from '@/shared/ui'

const session = useBattleSession()
const tower = computed(() => session.selectedTower)
const stats = computed(() =>
  tower.value ? towerStats(tower.value.type, tower.value.level, tower.value.rank) : null,
)
const upgrade = computed(() =>
  tower.value ? upgradeCost(tower.value.type, tower.value.level) : null,
)
const nextXp = computed(() => (tower.value ? RANKS[tower.value.rank + 1]?.xp : undefined))
const xpPct = computed(() =>
  nextXp.value === undefined ? 100 : Math.min(100, ((tower.value?.xp ?? 0) / nextXp.value) * 100),
)
// кнопка остаётся активной (команда вернёт отказ с подсказкой), но выглядит «не по карману»
const poor = computed(() => upgrade.value !== null && session.money < upgrade.value)
const priorities: TargetPriority[] = ['first', 'strongest', 'closest']

function cmd(c: 'upgradeTower' | 'sellTower') {
  session.dispatch({ type: c, towerId: tower.value!.id })
}
</script>

<template>
  <aside v-if="tower && stats" class="panel" data-testid="tower-panel">
    <header class="head">
      <UiIcon :name="tower.type" :size="36" class="ico" />
      <div>
        <h3>{{ t.towers[tower.type] }}</h3>
        <div class="level" data-testid="tower-level">
          {{ t.tower.level.replace('{n}', String(tower.level)) }}
        </div>
      </div>
    </header>
    <div class="rank" data-testid="tower-rank">
      <span class="chevrons" aria-hidden="true">
        <UiIcon v-for="n in tower.rank" :key="n" name="chevron" :size="16" />
      </span>
      {{ t.tower.rank.replace('{name}', t.ranks[RANKS[tower.rank]!.id]) }}
    </div>
    <div class="xp">
      <i class="bar"><i :style="{ width: xpPct + '%' }" /></i>
      <small>{{
        nextXp === undefined
          ? t.tower.xpMax
          : t.tower.xpToNext.replace('{xp}', String(tower.xp)).replace('{next}', String(nextXp))
      }}</small>
    </div>
    <dl class="stats">
      <div>
        <UiIcon name="damage" :size="16" />
        <dt>{{ t.tower.damage }}</dt>
        <dd>{{ Math.round(stats.damage) }}</dd>
      </div>
      <div>
        <UiIcon name="rate" :size="16" />
        <dt>{{ t.tower.fireRate }}</dt>
        <dd>{{ (TICK_RATE / stats.reloadTicks).toFixed(1) }}</dd>
      </div>
      <div>
        <UiIcon name="range" :size="16" />
        <dt>{{ t.tower.range }}</dt>
        <dd>{{ stats.range.toFixed(1) }}</dd>
      </div>
    </dl>
    <div class="prio" role="group" :aria-label="t.tower.priority">
      <UiButton
        v-for="p in priorities"
        :key="p"
        :variant="tower.priority === p ? 'primary' : 'secondary'"
        :data-testid="`prio-${p}`"
        @click="session.dispatch({ type: 'setTargetPriority', towerId: tower.id, priority: p })"
      >
        {{ t.priority[p] }}
      </UiButton>
    </div>
    <UiButton
      :disabled="upgrade === null"
      :class="{ poor }"
      data-testid="tower-upgrade"
      @click="cmd('upgradeTower')"
    >
      <UiIcon name="upgrade" :size="16" />
      {{ upgrade === null ? t.tower.upgradeMax : t.tower.upgrade.replace('{n}', String(upgrade)) }}
    </UiButton>
    <UiButton variant="secondary" data-testid="tower-sell" @click="cmd('sellTower')">
      <UiIcon name="sell" :size="16" />
      {{ t.tower.sell.replace('{n}', String(sellRefund(tower.invested))) }}
    </UiButton>
  </aside>
</template>

<style scoped>
.panel {
  --edge: 14px;
  position: absolute;
  right: var(--safe-right);
  top: calc(var(--safe-top) + 76px);
  width: 260px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 14px 18px;
  box-sizing: border-box;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 6%), transparent 40%),
    linear-gradient(160deg, rgb(44 52 36 / 96%), rgb(18 22 15 / 96%));
  clip-path: polygon(
    var(--edge) 0,
    100% 0,
    100% calc(100% - var(--edge)),
    calc(100% - var(--edge)) 100%,
    0 100%,
    0 var(--edge)
  );
  box-shadow:
    inset 0 0 0 2px var(--c-brass),
    inset 0 0 0 3px rgb(0 0 0 / 60%);
  pointer-events: auto;
  animation: ui-pop-in 0.2s var(--ease);
}
.head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ico {
  color: var(--c-accent);
}
h3 {
  margin: 0;
  color: var(--c-accent);
  text-transform: uppercase;
  font-size: 1.05rem;
}
.level {
  font-size: 0.8rem;
  color: var(--c-sand);
}
.rank {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
}
.chevrons {
  display: inline-flex;
  color: var(--c-accent);
}
.xp small {
  color: var(--c-muted);
  font-size: 0.7rem;
}
.bar {
  display: block;
  height: 6px;
  margin-bottom: 3px;
  background: rgb(0 0 0 / 55%);
  box-shadow: inset 0 0 0 1px rgb(184 154 82 / 30%);
}
.bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--c-olive), var(--c-olive-bright));
  transition: width 0.3s var(--ease);
}
.stats {
  margin: 0;
  padding: 6px 8px;
  background: rgb(0 0 0 / 30%);
  font-size: 0.8rem;
}
.stats div {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 22px;
  color: var(--c-muted);
}
.stats dt {
  flex: 1;
}
.stats dd {
  margin: 0;
  font-weight: 700;
  color: var(--c-text);
}
.prio {
  display: flex;
  gap: 4px;
}
.prio :deep(.btn) {
  padding: 0 4px;
  flex: 1;
  font-size: 0.65rem;
  letter-spacing: 0;
}
.poor {
  filter: saturate(0.5) brightness(0.8);
}
@media (pointer: coarse) {
  /* bottom sheet над меню постройки */
  .panel {
    left: var(--safe-left);
    right: var(--safe-right);
    top: auto;
    bottom: calc(var(--safe-bottom) + 100px);
    width: auto;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    clip-path: none;
  }
}
</style>

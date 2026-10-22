<script setup lang="ts">
import { computed } from 'vue'
import { useBattleSession } from '@/entities/battle'
import {
  RANKS,
  sellRefund,
  towerStats,
  upgradeCost,
  upgradeTicks,
  type TargetPriority,
} from '@/entities/tower'
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
const xpTitle = computed(() =>
  nextXp.value === undefined
    ? t.tower.xpMax
    : t.tower.xpToNext
        .replace('{xp}', String(tower.value?.xp ?? 0))
        .replace('{next}', String(nextXp.value)),
)
const rankTitle = computed(() =>
  tower.value ? t.tower.rank.replace('{name}', t.ranks[RANKS[tower.value.rank]!.id]) : '',
)
const sellTitle = computed(() =>
  tower.value ? t.tower.sell.replace('{n}', String(sellRefund(tower.value.invested))) : '',
)
// кнопка остаётся активной (команда вернёт отказ с подсказкой), но выглядит «не по карману»
const poor = computed(() => upgrade.value !== null && session.money < upgrade.value)
const priorities: TargetPriority[] = ['first', 'strongest', 'closest']

const phase = computed(() => tower.value?.phase ?? 'active')
const busy = computed(() => phase.value === 'building' || phase.value === 'upgrading')
const progressPct = computed(() => Math.round((tower.value?.progress ?? 0) * 100))
const secondsLeft = computed(() =>
  t.tower.secondsLeft.replace(
    '{n}',
    String(Math.ceil((tower.value?.phaseTicksLeft ?? 0) / TICK_RATE)),
  ),
)
const upgradeTitle = computed(() =>
  tower.value && tower.value.level < 3
    ? t.tower.upgradeTitle.replace(
        '{n}',
        String(upgradeTicks(tower.value.type, tower.value.level as 1 | 2) / TICK_RATE),
      )
    : '',
)
const cancelTitle = computed(() =>
  phase.value === 'queued'
    ? t.tower.cancelQueuedTitle
    : t.tower.cancelTitle.replace('{n}', String(tower.value?.phasePaid ?? 0)),
)

function cmd(c: 'upgradeTower' | 'sellTower') {
  session.dispatch({ type: c, towerId: tower.value!.id })
}

function cancel() {
  const towerId = tower.value!.id
  session.dispatch({ type: phase.value === 'upgrading' ? 'cancelUpgrade' : 'cancelBuild', towerId })
}
</script>

<template>
  <aside v-if="tower && stats" class="panel" data-testid="tower-panel">
    <header class="head">
      <UiIcon :name="tower.type" :size="24" class="ico" />
      <h3>{{ t.towers[tower.type] }}</h3>
      <span class="chevrons" data-testid="tower-rank" :title="rankTitle" :aria-label="rankTitle">
        <UiIcon v-for="n in tower.rank" :key="n" name="chevron" :size="14" />
      </span>
      <span class="level" data-testid="tower-level">
        {{ t.tower.level.replace('{n}', String(tower.level)) }}
      </span>
    </header>
    <i class="bar" :title="xpTitle"><i :style="{ width: xpPct + '%' }" /></i>
    <dl class="stats">
      <div :title="t.tower.damage">
        <UiIcon name="damage" :size="14" />
        <dd>{{ Math.round(stats.damage) }}</dd>
      </div>
      <div :title="t.tower.fireRate">
        <UiIcon name="rate" :size="14" />
        <dd>{{ (TICK_RATE / stats.reloadTicks).toFixed(1) }}</dd>
      </div>
      <div :title="t.tower.range">
        <UiIcon name="range" :size="14" />
        <dd>{{ stats.range.toFixed(1) }}</dd>
      </div>
    </dl>
    <div class="prio" role="group" :aria-label="t.tower.priority">
      <button
        v-for="p in priorities"
        :key="p"
        type="button"
        :class="{ on: tower.priority === p }"
        :aria-pressed="tower.priority === p"
        :aria-label="t.priority[p]"
        :data-testid="`prio-${p}`"
        @click="session.dispatch({ type: 'setTargetPriority', towerId: tower.id, priority: p })"
      >
        {{ t.priorityShort[p] }}
      </button>
    </div>
    <div v-if="phase !== 'active'" class="phase" data-testid="tower-phase">
      <span>{{ t.tower[phase] }}</span>
      <span v-if="busy" data-testid="tower-seconds">{{ secondsLeft }}</span>
    </div>
    <i
      v-if="busy"
      class="bar progress"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="progressPct"
      data-testid="tower-progress"
    >
      <i :style="{ width: progressPct + '%' }" />
    </i>
    <div class="actions">
      <UiButton
        v-if="phase !== 'active'"
        size="sm"
        variant="secondary"
        :title="cancelTitle"
        :aria-label="cancelTitle"
        data-testid="tower-cancel"
        @click="cancel"
      >
        <UiIcon name="close" :size="14" />
        {{ t.tower.cancel }}
      </UiButton>
      <UiButton
        v-if="phase === 'active'"
        size="sm"
        :disabled="upgrade === null"
        :class="{ poor }"
        :title="upgradeTitle"
        data-testid="tower-upgrade"
        @click="cmd('upgradeTower')"
      >
        <UiIcon name="upgrade" :size="14" />
        {{
          upgrade === null ? t.tower.upgradeMax : t.tower.upgrade.replace('{n}', String(upgrade))
        }}
      </UiButton>
      <UiButton
        v-if="phase === 'active' || phase === 'upgrading'"
        size="sm"
        variant="secondary"
        data-testid="tower-sell"
        :disabled="phase === 'upgrading'"
        :title="phase === 'upgrading' ? t.tower.sellBlocked : sellTitle"
        :aria-label="phase === 'upgrading' ? t.tower.sellBlocked : sellTitle"
        @click="cmd('sellTower')"
      >
        <UiIcon name="sell" :size="14" />
        {{ t.tower.sellShort.replace('{n}', String(sellRefund(tower.invested))) }}
      </UiButton>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  position: absolute;
  right: var(--safe-right);
  /* высота HUD + зазор */
  top: calc(var(--safe-top) + var(--hud-h) + var(--gap));
  width: 15rem;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--gap);
  box-sizing: border-box;
  background: var(--panel-bg);
  border: var(--panel-border);
  border-radius: var(--r-lg);
  pointer-events: auto;
  animation: ui-pop-in 0.2s var(--ease);
}
.head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.ico,
.chevrons {
  color: var(--c-accent);
}
h3 {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--c-accent);
  text-transform: uppercase;
  font-size: var(--fs-sm);
}
.chevrons {
  display: inline-flex;
}
.level {
  font-size: var(--fs-xs);
  color: var(--c-sand);
  white-space: nowrap;
}
.bar {
  display: block;
  height: 3px;
  background: rgb(0 0 0 / 55%);
}
.bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--c-olive), var(--c-olive-bright));
  transition: width 0.3s var(--ease);
}
.stats {
  display: flex;
  justify-content: space-between;
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--c-muted);
}
.stats div {
  display: flex;
  align-items: center;
  gap: 4px;
}
.stats dd {
  margin: 0;
  font-weight: 700;
  color: var(--c-text);
}
.prio {
  display: flex;
  border: var(--panel-border);
  border-radius: var(--r);
  overflow: hidden;
}
.prio button {
  flex: 1;
  min-height: 2rem;
  padding: 0 2px;
  transition:
    background-color 0.12s var(--ease),
    border-color 0.12s var(--ease);
  border: 0;
  border-left: var(--panel-border);
  background: var(--c-steel-800);
  color: var(--c-muted);
  font: 700 0.8125rem / 1 var(--font-body);
  cursor: pointer;
}
.prio button:hover:not(.on) {
  background: var(--c-steel-700);
  box-shadow: inset 0 0 0 1px rgb(240 166 58 / 50%);
}
.prio button:first-child {
  border-left: 0;
}
.prio button.on {
  background: var(--c-accent);
  color: #1d1409;
}
.actions {
  display: flex;
  gap: 12px;
}
.actions :deep(.btn:first-child) {
  flex: 1;
  gap: 4px;
  padding: 0 6px;
  white-space: nowrap;
  font-size: var(--fs-sm);
}
.actions :deep(.btn:last-child) {
  gap: 4px;
  padding: 0 8px;
  white-space: nowrap;
  font-size: var(--fs-sm);
  --bd: var(--c-danger);
  --ink: #f0b3a6;
  --bg: transparent;
  --bg-hover: #4a2a22;
}
.phase {
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-xs);
  color: var(--c-sand);
}
.progress i {
  transition: none;
}
.poor {
  filter: saturate(0.5) brightness(0.8);
}
@media (pointer: coarse) {
  .prio button {
    min-height: var(--ui-h-touch);
  }
}
</style>

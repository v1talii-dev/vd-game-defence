<script setup lang="ts">
import { computed } from 'vue'
import { useBattleSession } from '@/entities/battle'
import { RANKS, sellRefund, towerStats, upgradeCost, type TargetPriority } from '@/entities/tower'
import { TICK_RATE } from '@/shared/config'
import { t } from '@/shared/i18n'
import { UiButton } from '@/shared/ui'

const session = useBattleSession()
const tower = computed(() => session.selectedTower)
const stats = computed(() =>
  tower.value ? towerStats(tower.value.type, tower.value.level, tower.value.rank) : null,
)
const upgrade = computed(() =>
  tower.value ? upgradeCost(tower.value.type, tower.value.level) : null,
)
const nextXp = computed(() => (tower.value ? RANKS[tower.value.rank + 1]?.xp : undefined))
const priorities: TargetPriority[] = ['first', 'strongest', 'closest']

function cmd(c: 'upgradeTower' | 'sellTower') {
  session.dispatch({ type: c, towerId: tower.value!.id })
}
</script>

<template>
  <aside v-if="tower && stats" class="panel" data-testid="tower-panel">
    <h3>{{ t.towers[tower.type] }}</h3>
    <div data-testid="tower-level">{{ t.tower.level.replace('{n}', String(tower.level)) }}</div>
    <div data-testid="tower-rank">
      <span class="chevrons" aria-hidden="true">{{ '▲'.repeat(tower.rank) }}</span>
      {{ t.tower.rank.replace('{name}', t.ranks[RANKS[tower.rank]!.id]) }}
    </div>
    <div>
      {{
        nextXp === undefined
          ? t.tower.xpMax
          : t.tower.xpToNext.replace('{xp}', String(tower.xp)).replace('{next}', String(nextXp))
      }}
    </div>
    <div>{{ t.tower.damage }}: {{ Math.round(stats.damage) }}</div>
    <div>{{ t.tower.fireRate }}: {{ (TICK_RATE / stats.reloadTicks).toFixed(1) }}</div>
    <div>{{ t.tower.range }}: {{ stats.range.toFixed(1) }}</div>
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
    <UiButton :disabled="upgrade === null" data-testid="tower-upgrade" @click="cmd('upgradeTower')">
      {{ upgrade === null ? t.tower.upgradeMax : t.tower.upgrade.replace('{n}', String(upgrade)) }}
    </UiButton>
    <UiButton variant="secondary" data-testid="tower-sell" @click="cmd('sellTower')">
      {{ t.tower.sell.replace('{n}', String(sellRefund(tower.invested))) }}
    </UiButton>
  </aside>
</template>

<style scoped>
.panel {
  position: absolute;
  right: var(--safe-right);
  top: calc(var(--safe-top) + 64px);
  width: 240px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: rgb(28 26 20 / 90%);
  border: 1px solid var(--c-sand);
  border-radius: 6px;
  pointer-events: auto;
}
h3 {
  margin: 0;
  color: var(--c-sand);
}
.prio {
  display: flex;
  gap: 4px;
}
.prio :deep(.btn) {
  padding: 0 6px;
  flex: 1;
  font-size: 12px;
}
.chevrons {
  color: var(--c-accent);
}
@media (pointer: coarse) {
  /* bottom sheet над меню постройки */
  .panel {
    left: var(--safe-left);
    right: var(--safe-right);
    top: auto;
    bottom: calc(var(--safe-bottom) + 76px);
    width: auto;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    border-radius: 12px 12px 0 0;
  }
}
</style>

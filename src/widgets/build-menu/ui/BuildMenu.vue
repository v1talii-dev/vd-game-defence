<script setup lang="ts">
import { computed } from 'vue'
import { useBattleSession } from '@/entities/battle'
import { TOWERS, TOWER_TYPES, type TowerType } from '@/entities/tower'
import { t } from '@/shared/i18n'
import { UiIcon } from '@/shared/ui'

const session = useBattleSession()
// только башни уровня, в порядке конфига башен
const towers = computed(() => TOWER_TYPES.filter((x) => session.allowedTowers.includes(x)))
const cost = (type: TowerType) => TOWERS[type].levels[0].cost

function toggle(type: TowerType) {
  session.setBuildType(session.buildType === type ? null : type)
}

// предпросмотр радиуса: только мышь и клавиатурный фокус (на touch mouseenter эмулируется тапом)
function hover(type: TowerType | null, e: Event) {
  const el = e.target as HTMLElement
  const ok =
    type === null ||
    (e.type === 'focus'
      ? el.matches(':focus-visible')
      : (e as PointerEvent).pointerType === 'mouse')
  if (ok) session.setHoveredBuildType(type)
}

function cancel() {
  session.pendingCell = null
  session.setBuildType(null)
}

// название — только в подсказке и aria-label
const label = (type: TowerType, i: number) =>
  `${t.towers[type]}, ${cost(type)} (${t.build.hotkey.replace('{k}', String(i + 1))})`
</script>

<template>
  <nav class="build-menu" :aria-label="t.build.title">
    <button
      v-for="(type, i) in towers"
      :key="type"
      class="tower"
      :class="{ active: session.buildType === type, poor: session.money < cost(type) }"
      :aria-pressed="session.buildType === type"
      :aria-label="label(type, i)"
      :title="label(type, i)"
      :data-testid="`build-${type}`"
      @click="toggle(type)"
      @pointerenter="hover(type, $event)"
      @pointerleave="hover(null, $event)"
      @focus="hover(type, $event)"
      @blur="hover(null, $event)"
    >
      <kbd class="key">{{ i + 1 }}</kbd>
      <UiIcon :name="type" :size="28" class="ico" />
      <span class="cost">{{ cost(type) }}</span>
    </button>
    <template v-if="session.pendingCell">
      <button
        class="act ok"
        :aria-label="t.build.confirm"
        :title="t.build.confirm"
        data-testid="build-confirm"
        @click="session.confirmBuild()"
      >
        <UiIcon name="check" :size="22" />
      </button>
      <button
        class="act"
        :aria-label="t.build.cancel"
        :title="t.build.cancel"
        data-testid="build-cancel"
        @click="cancel"
      >
        <UiIcon name="close" :size="22" />
      </button>
    </template>
  </nav>
</template>

<style scoped>
.build-menu {
  --slot: 3.75rem;

  position: absolute;
  left: var(--safe-left);
  bottom: var(--safe-bottom);
  display: flex;
  align-items: stretch;
  gap: 6px;
  padding: 4px 6px;
  background: var(--panel-bg);
  border: var(--panel-border);
  border-bottom: 0;
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  pointer-events: auto;
  animation: ui-fade-in 0.3s var(--ease);
}
.tower,
.act {
  position: relative;
  box-sizing: border-box;
  width: var(--slot);
  height: var(--slot);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0;
  font: inherit;
  color: var(--c-text);
  background: var(--c-steel-700);
  border: 2px solid transparent;
  border-radius: var(--r);
  cursor: pointer;
  transition:
    background-color 0.12s var(--ease),
    border-color 0.12s var(--ease);
}
.tower:hover,
.act:hover {
  background: var(--c-steel-600);
}
.tower:active,
.act:active {
  transform: translateY(1px);
}
.tower:focus-visible,
.act:focus-visible {
  outline: 2px solid var(--c-text);
  outline-offset: 1px;
}
.tower:hover:not(.active) {
  border-color: rgb(240 166 58 / 50%);
}
.tower.active {
  border-color: var(--c-accent);
}
.ico {
  color: var(--c-sand);
}
.cost {
  font: 700 0.8125rem / 1 var(--font-body);
  color: var(--c-accent);
}
/* не хватает кредитов */
.poor .cost {
  color: var(--c-danger);
}
.key {
  position: absolute;
  top: 1px;
  left: 3px;
  font: 700 var(--fs-xs) / 1 var(--font-body);
  color: var(--c-muted);
}
.act.ok {
  color: var(--c-ok);
}
@media (pointer: coarse) {
  .build-menu {
    --slot: 4rem;

    right: var(--safe-right);
    justify-content: center;
  }
  .key {
    display: none;
  }
}
</style>

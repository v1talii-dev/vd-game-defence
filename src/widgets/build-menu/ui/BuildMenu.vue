<script setup lang="ts">
import { useBattleSession } from '@/entities/battle'
import { TOWERS, TOWER_TYPES, type TowerType } from '@/entities/tower'
import { t } from '@/shared/i18n'
import { UiButton } from '@/shared/ui'

const session = useBattleSession()
const cost = (type: TowerType) => TOWERS[type].levels[0].cost

function toggle(type: TowerType) {
  session.setBuildType(session.buildType === type ? null : type)
}

function cancel() {
  session.pendingCell = null
  session.setBuildType(null)
}
</script>

<template>
  <nav class="build-menu" :aria-label="t.build.title">
    <button
      v-for="(type, i) in TOWER_TYPES"
      :key="type"
      class="tower"
      :class="{ active: session.buildType === type, dim: session.money < cost(type) }"
      :aria-pressed="session.buildType === type"
      :data-testid="`build-${type}`"
      @click="toggle(type)"
    >
      <span class="name">{{ t.towers[type] }}</span>
      <span>{{ cost(type) }}</span>
      <small>{{ t.build.hotkey.replace('{k}', String(i + 1)) }}</small>
    </button>
    <template v-if="session.pendingCell">
      <UiButton data-testid="build-confirm" @click="session.confirmBuild()">
        {{ t.build.confirm }}
      </UiButton>
      <UiButton variant="secondary" data-testid="build-cancel" @click="cancel">
        {{ t.build.cancel }}
      </UiButton>
    </template>
  </nav>
</template>

<style scoped>
.build-menu {
  position: absolute;
  left: var(--safe-left);
  bottom: var(--safe-bottom);
  display: flex;
  gap: 8px;
  padding: 8px;
  background: rgb(28 26 20 / 85%);
  border-top-right-radius: 6px;
  pointer-events: auto;
}
.tower {
  min-width: 88px;
  min-height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font: inherit;
  color: var(--c-text);
  background: transparent;
  border: 2px solid var(--c-sand);
  border-radius: 4px;
  cursor: pointer;
}
.tower.dim {
  opacity: 0.45;
}
.tower.active {
  border-color: var(--c-accent);
  background: rgb(217 130 43 / 30%);
}
.name {
  font-weight: 700;
}
small {
  opacity: 0.7;
}
@media (pointer: coarse) {
  /* bottom sheet на всю ширину */
  .build-menu {
    right: var(--safe-right);
    justify-content: center;
    border-radius: 12px 12px 0 0;
  }
  small {
    display: none;
  }
}
</style>

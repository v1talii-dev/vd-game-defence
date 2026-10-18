<script setup lang="ts">
import { useBattleSession } from '@/entities/battle'
import { TOWERS, TOWER_TYPES, type TowerType } from '@/entities/tower'
import { t } from '@/shared/i18n'
import { UiButton, UiIcon } from '@/shared/ui'

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
      :title="t.build.hotkey.replace('{k}', String(i + 1))"
      :data-testid="`build-${type}`"
      @click="toggle(type)"
    >
      <kbd class="key">{{ i + 1 }}</kbd>
      <UiIcon :name="type" :size="34" class="ico" />
      <span class="name">{{ t.towers[type] }}</span>
      <span class="cost"><UiIcon name="coin" :size="14" />{{ cost(type) }}</span>
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
  align-items: stretch;
  gap: 8px;
  padding: 12px 34px 10px 14px;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 6%), transparent 50%),
    linear-gradient(180deg, rgb(32 38 27 / 95%), rgb(15 18 13 / 94%));
  clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 100%, 0 100%);
  box-shadow: inset 0 2px 0 var(--c-brass);
  pointer-events: auto;
  animation: ui-fade-in 0.3s var(--ease);
}
.tower {
  position: relative;
  min-width: 96px;
  min-height: 84px;
  padding: 8px 10px 6px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font: inherit;
  color: var(--c-text);
  background: linear-gradient(180deg, var(--c-steel-600), var(--c-steel-800));
  border: 0;
  box-shadow:
    inset 0 0 0 1px rgb(0 0 0 / 60%),
    inset 0 1px 0 rgb(255 255 255 / 20%);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
  cursor: pointer;
  transition:
    filter 0.15s var(--ease),
    transform 0.1s var(--ease);
}
.tower:hover {
  filter: brightness(1.2);
}
.tower:active {
  transform: translateY(1px);
}
.tower:focus-visible {
  outline: 2px solid var(--c-text);
  outline-offset: -4px;
}
.tower.active {
  background: linear-gradient(180deg, #ffc765, var(--c-accent-dark));
  color: #1d1409;
  box-shadow: inset 0 0 0 2px #fff3cf;
}
.ico {
  color: var(--c-sand);
}
.active .ico {
  color: #1d1409;
}
.name {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.cost {
  display: flex;
  align-items: center;
  gap: 3px;
  font-family: var(--font-display);
  font-size: 0.85rem;
  color: var(--c-accent);
}
.active .cost {
  color: #1d1409;
}
/* не хватает кредитов */
.tower.dim {
  filter: saturate(0.4) brightness(0.75);
}
.tower.dim .cost {
  color: var(--c-danger);
}
.key {
  position: absolute;
  top: 4px;
  left: 10px;
  min-width: 16px;
  padding: 0 3px;
  text-align: center;
  font: 700 0.65rem/16px var(--font-body);
  color: var(--c-muted);
  background: rgb(0 0 0 / 45%);
  box-shadow: inset 0 0 0 1px rgb(184 154 82 / 40%);
}
.active .key {
  color: #1d1409;
  background: rgb(255 255 255 / 40%);
}
@media (pointer: coarse) {
  /* bottom sheet на всю ширину */
  .build-menu {
    left: var(--safe-left);
    right: var(--safe-right);
    transform: none;
    justify-content: center;
    clip-path: none;
  }
  .key {
    display: none;
  }
}
</style>

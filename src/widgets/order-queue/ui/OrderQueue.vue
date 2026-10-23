<script setup lang="ts">
import { useBattleSession } from '@/entities/battle'
import { t } from '@/shared/i18n'
import { UiIcon } from '@/shared/ui'

const session = useBattleSession()
// окружность кольца r=9 → длина 2πr
const C = 56.55

function cancel(o: (typeof session.orders)[number]) {
  session.dispatch({
    type: o.kind === 'build' ? 'cancelBuild' : 'cancelUpgrade',
    towerId: o.towerId,
  })
}
</script>

<template>
  <ul
    v-if="session.orders.length"
    class="queue"
    :aria-label="t.queue.title"
    data-testid="order-queue"
  >
    <li
      v-for="o in session.orders"
      :key="`${o.kind}-${o.towerId}`"
      class="row"
      :class="o.kind"
      :data-testid="`order-${o.kind}-${o.towerId}`"
      :data-status="o.status"
    >
      <button
        type="button"
        class="pick"
        :title="t.queue.select"
        data-testid="order-select"
        @click="session.select(o.towerId)"
      >
        <svg
          class="ring"
          :class="{ spin: o.status === 'waiting' }"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" class="track" />
          <circle
            cx="12"
            cy="12"
            r="9"
            class="arc"
            :stroke-dasharray="`${o.status === 'waiting' ? C * 0.25 : C * o.progress} ${C}`"
          />
        </svg>
        <UiIcon :name="o.type" :size="18" class="ico" />
        <span class="txt">
          <b>{{
            o.kind === 'build' ? t.queue.build : t.queue.upgrade.replace('{n}', String(o.toLevel))
          }}</b>
          <small data-testid="order-state">
            {{ o.status === 'waiting' ? t.queue.waiting : t.queue.working[o.kind] }}
          </small>
        </span>
        <span class="cost">{{ o.cost }}</span>
      </button>
      <button
        type="button"
        class="x"
        :title="t.queue.cancel"
        :aria-label="t.queue.cancel"
        data-testid="order-cancel"
        @click="cancel(o)"
      >
        <UiIcon name="close" :size="14" />
      </button>
    </li>
  </ul>
</template>

<style scoped>
.queue {
  position: absolute;
  left: var(--safe-left);
  top: calc(var(--safe-top) + var(--hud-h) + var(--gap));
  width: 13rem;
  max-height: 40%;
  overflow-y: auto;
  margin: 0;
  padding: 4px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--panel-bg);
  border: var(--panel-border);
  border-radius: var(--r-lg);
  pointer-events: auto;
}
.row {
  display: flex;
  align-items: stretch;
  --ring: #ffd24a;
}
.row.upgrade {
  --ring: #4ac8ff;
}
button {
  min-height: 2.75rem;
  border: 0;
  background: transparent;
  color: var(--c-text);
  font: inherit;
  cursor: pointer;
}
button:hover {
  background: var(--c-steel-700);
}
.pick {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
  text-align: left;
  position: relative;
}
.ring {
  position: absolute;
  left: 2px;
  width: 26px;
  height: 26px;
  transform: rotate(-90deg);
}
.ring circle {
  fill: none;
  stroke-width: 2.5;
}
.track {
  stroke: rgb(0 0 0 / 55%);
}
.arc {
  stroke: var(--ring);
}
.spin {
  animation: queue-spin 1s linear infinite;
}
@keyframes queue-spin {
  to {
    transform: rotate(270deg);
  }
}
.ico {
  flex: none;
  margin-left: 4px;
  color: var(--c-accent);
}
.txt {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-size: var(--fs-xs);
}
.txt small {
  color: var(--c-sand);
}
.cost {
  font-size: var(--fs-xs);
  font-weight: 700;
}
.x {
  flex: none;
  width: 2.75rem;
  color: #f0b3a6;
}
</style>

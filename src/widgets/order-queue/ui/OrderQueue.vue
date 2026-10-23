<script setup lang="ts">
import { computed } from 'vue'
import { useBattleSession } from '@/entities/battle'
import { t } from '@/shared/i18n'
import { UiIcon } from '@/shared/ui'

const session = useBattleSession()
// окружность кольца r=9 → длина 2πr
const C = 56.55
const VISIBLE = 4

const shown = computed(() =>
  session.queueExpanded ? session.orders : session.orders.slice(0, VISIBLE),
)
const extra = computed(() => Math.max(0, session.orders.length - VISIBLE))

type Order = (typeof session.orders)[number]

function cancel(o: Order) {
  session.dispatch({
    type: o.kind === 'build' ? 'cancelBuild' : 'cancelUpgrade',
    towerId: o.towerId,
  })
}
function arc(o: Order) {
  return `${o.status === 'waiting' ? C * 0.25 : C * o.progress} ${C}`
}
function stateText(o: Order) {
  return o.status === 'waiting' ? t.queue.waiting : t.queue.working[o.kind]
}
</script>

<template>
  <div v-if="session.orders.length" class="queue" data-testid="order-queue">
    <button
      v-if="session.queueCollapsed"
      type="button"
      class="chip"
      :title="t.queue.expand"
      :aria-label="t.queue.expand"
      data-testid="order-expand"
      @click="session.queueCollapsed = false"
    >
      <svg
        class="ring"
        :class="{ spin: session.orders[0]!.status === 'waiting' }"
        viewBox="0 0 24 24"
        aria-hidden="true"
        :style="{ '--ring': session.orders[0]!.kind === 'upgrade' ? '#4ac8ff' : '#ffd24a' }"
      >
        <circle cx="12" cy="12" r="9" class="track" />
        <circle cx="12" cy="12" r="9" class="arc" :stroke-dasharray="arc(session.orders[0]!)" />
      </svg>
      {{ t.queue.chip.replace('{n}', String(session.orders.length)) }}
    </button>
    <template v-else>
      <div class="head">
        <span>{{ t.queue.header.replace('{n}', String(session.orders.length)) }}</span>
        <button
          type="button"
          class="fold"
          :title="t.queue.collapse"
          :aria-label="t.queue.collapse"
          data-testid="order-collapse"
          @click="session.queueCollapsed = true"
        >
          <UiIcon name="close" :size="12" />
        </button>
      </div>
      <ul class="list" :class="{ scroll: session.queueExpanded }">
        <li
          v-for="o in shown"
          :key="`${o.kind}-${o.towerId}`"
          class="row"
          :class="o.kind"
          :data-testid="`order-${o.kind}-${o.towerId}`"
          :data-status="o.status"
        >
          <button
            type="button"
            class="pick"
            :title="`${stateText(o)} · ${t.queue.select}`"
            data-testid="order-select"
            @click="session.select(o.towerId)"
          >
            <span
              role="img"
              class="state"
              :aria-label="stateText(o)"
              :data-state="o.status"
              data-testid="order-state"
            >
              <svg class="ring" :class="{ spin: o.status === 'waiting' }" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" class="track" />
                <circle cx="12" cy="12" r="9" class="arc" :stroke-dasharray="arc(o)" />
              </svg>
            </span>
            <UiIcon :name="o.type" :size="16" class="ico" />
            <span class="lbl">{{
              o.kind === 'upgrade' ? t.queue.levelShort.replace('{n}', String(o.toLevel)) : ''
            }}</span>
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
            <UiIcon name="close" :size="12" />
          </button>
        </li>
      </ul>
      <button
        v-if="extra"
        type="button"
        class="more"
        :title="session.queueExpanded ? t.queue.lessTitle : t.queue.moreTitle"
        data-testid="order-more"
        @click="session.queueExpanded = !session.queueExpanded"
      >
        {{ session.queueExpanded ? t.queue.lessTitle : t.queue.more.replace('{n}', String(extra)) }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.queue {
  position: absolute;
  left: var(--safe-left);
  top: calc(var(--safe-top) + var(--hud-h) + var(--gap));
  width: 9.5rem;
  padding: 2px;
  display: flex;
  flex-direction: column;
  background: var(--panel-bg);
  border: var(--panel-border);
  border-radius: var(--r-lg);
  font-size: var(--fs-xs);
  pointer-events: auto;
  --row-h: 28px;
}
@media (pointer: coarse) {
  .queue {
    --row-h: 44px;
  }
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px 0 6px;
  color: var(--c-sand);
}
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.list.scroll {
  max-height: calc(var(--row-h) * 6);
  overflow-y: auto;
}
.row {
  display: flex;
  height: var(--row-h);
  --ring: #ffd24a;
}
.row.upgrade {
  --ring: #4ac8ff;
}
button {
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
  gap: 4px;
  padding: 0 4px;
  text-align: left;
}
.state {
  display: inline-flex;
  flex: none;
}
.ring {
  width: 18px;
  height: 18px;
  transform: rotate(-90deg);
}
.ring circle {
  fill: none;
  stroke-width: 3;
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
  color: var(--c-accent);
}
.lbl {
  flex: 1;
  font-weight: 700;
}
.cost {
  font-size: 0.7rem;
  color: var(--c-sand);
}
.x,
.fold {
  flex: none;
  width: var(--row-h);
  color: #f0b3a6;
}
.fold {
  width: 24px;
  height: 20px;
  display: grid;
  place-items: center;
}
/* мышь: крестик только при наведении или фокусе строки; тач: всегда */
@media (hover: hover) and (pointer: fine) {
  .x {
    opacity: 0;
  }
  .row:hover .x,
  .row:focus-within .x {
    opacity: 1;
  }
}
.more,
.chip {
  min-height: var(--row-h);
  color: var(--c-sand);
}
.chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px;
  color: var(--c-text);
}
</style>

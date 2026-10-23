<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useProgressStore } from '@/entities/progress'
import { HOTKEYS, HOTKEY_GROUPS, matches, type HotkeyAction } from '@/shared/config'
import { t } from '@/shared/i18n'
import { UiButton, UiPanel } from '@/shared/ui'

const open = defineModel<boolean>({ required: true })
const progress = useProgressStore()
const closeBtn = ref<InstanceType<typeof UiButton> | null>(null)
const hint = ref(false)
let hintTimer: ReturnType<typeof setTimeout> | undefined

const groups = Object.entries(HOTKEY_GROUPS) as [keyof typeof HOTKEY_GROUPS, readonly HotkeyAction[]][]

function onKey(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (matches('help', e.code)) {
    open.value = !open.value
    e.preventDefault()
  } else if (open.value && matches('cancel', e.code)) {
    open.value = false
    e.preventDefault()
  }
}

// фокус в диалог при открытии, возврат на игру при закрытии
watch(open, async (v) => {
  if (v) {
    hint.value = false
    await nextTick()
    ;(closeBtn.value?.$el as HTMLElement | undefined)?.focus()
  } else (document.activeElement as HTMLElement | null)?.blur?.()
})

onMounted(() => {
  window.addEventListener('keydown', onKey)
  // разовая подсказка в первом бою
  if (!progress.helpHintSeen) {
    hint.value = true
    progress.markHelpHintSeen()
    hintTimer = setTimeout(() => (hint.value = false), 6000)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  clearTimeout(hintTimer)
})
</script>

<template>
  <div v-if="hint && !open" class="hint" role="status" data-testid="help-hint">
    {{ t.help.hint }}
  </div>
  <div v-if="open" class="overlay" @click.self="open = false">
    <UiPanel
      class="help"
      role="dialog"
      aria-modal="true"
      :aria-label="t.help.title"
      data-testid="key-help"
    >
      <h2>{{ t.help.title }}</h2>
      <div class="grid">
        <section v-for="[g, actions] in groups" :key="g" :data-testid="`help-group-${g}`">
          <h3>{{ t.help.groups[g] }}</h3>
          <dl>
            <div v-for="a in actions" :key="a" class="row" :data-testid="`help-${a}`">
              <dt>{{ t.help.actions[a] }}</dt>
              <dd>
                <kbd>{{ HOTKEYS[a].label }}</kbd>
              </dd>
            </div>
          </dl>
        </section>
      </div>
      <UiButton
        ref="closeBtn"
        variant="secondary"
        size="sm"
        data-testid="help-close"
        @click="open = false"
      >
        {{ t.help.close }}
      </UiButton>
    </UiPanel>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
  background: rgb(0 0 0 / 55%);
  animation: ui-fade-in 0.2s var(--ease);
  pointer-events: auto;
}
.help {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 94vw;
  max-height: 94vh;
  overflow: auto;
  animation: ui-pop-in 0.25s var(--ease);
}
h2 {
  margin: 0;
  font-size: var(--fs-lg);
  text-align: center;
  color: var(--c-accent);
}
h3 {
  margin: 0 0 2px;
  font-size: var(--fs-sm);
  color: var(--c-sand);
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 20px;
}
dl {
  margin: 0;
}
.row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: var(--fs-sm);
}
dt {
  color: var(--c-text);
}
dd {
  margin: 0;
}
kbd {
  padding: 0 5px;
  font: 700 var(--fs-xs) / 1.6 var(--font-body);
  color: var(--c-accent);
  white-space: nowrap;
  background: var(--c-steel-700);
  border-radius: var(--r);
}
.hint {
  position: absolute;
  right: calc(var(--safe-right) + var(--pad));
  bottom: calc(var(--safe-bottom) + var(--pad));
  padding: 4px 8px;
  font-size: var(--fs-sm);
  background: var(--panel-bg);
  border: var(--bw) solid var(--c-accent);
  border-radius: 4px;
  animation: ui-pop-in 0.25s var(--ease);
}
</style>

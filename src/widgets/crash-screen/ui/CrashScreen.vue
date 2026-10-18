<script setup lang="ts">
import { ref } from 'vue'
import { useBattleSession } from '@/entities/battle'
import { t } from '@/shared/i18n'
import { UiButton, UiPanel } from '@/shared/ui'
import { crashInfo } from '../model/crash'

const session = useBattleSession()
const copied = ref(false)

async function copy() {
  const replay = session.exportReplay()
  const text = JSON.stringify(
    { seed: replay?.seed, replay, userAgent: navigator.userAgent, error: crashInfo.value },
    null,
    2,
  )
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
  } catch {
    // буфер недоступен — отчёт остаётся в консоли
    console.warn(text)
  }
}
</script>

<template>
  <div v-if="crashInfo" class="overlay" role="alertdialog" data-testid="crash-screen">
    <UiPanel class="box">
      <h2>{{ t.crash.title }}</h2>
      <p>{{ t.crash.message }}</p>
      <UiButton data-testid="crash-copy" @click="copy">
        {{ copied ? t.crash.copied : t.crash.copy }}
      </UiButton>
    </UiPanel>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: radial-gradient(ellipse at center, rgb(40 8 4 / 70%), rgb(0 0 0 / 90%));
  animation: ui-fade-in 0.3s var(--ease);
}
.box {
  max-width: min(460px, 90vw);
}
h2 {
  margin: 0 0 8px;
  color: var(--c-danger);
  text-transform: uppercase;
}
p {
  color: var(--c-muted);
}
</style>

<script setup lang="ts">
import { ref } from 'vue'
import { useBattleSession } from '@/entities/battle'
import { t } from '@/shared/i18n'
import { UiButton } from '@/shared/ui'
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
    <div class="box">
      <h2>{{ t.crash.title }}</h2>
      <p>{{ t.crash.message }}</p>
      <UiButton data-testid="crash-copy" @click="copy">
        {{ copied ? t.crash.copied : t.crash.copy }}
      </UiButton>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 80%);
}
.box {
  max-width: min(440px, 90vw);
  padding: 24px;
  background: var(--c-bg);
  border: 2px solid var(--c-accent);
  border-radius: 6px;
}
h2 {
  margin: 0 0 8px;
  color: var(--c-sand);
}
</style>

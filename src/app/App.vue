<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { CrashScreen } from '@/widgets/crash-screen'
import { UiLoading } from '@/shared/ui'
import RotateHint from './ui/RotateHint.vue'

// Старт: ждём первый роут (включая ленивый чанк страницы) и шрифты
const booting = ref(true)
void Promise.all([useRouter().isReady(), document.fonts?.ready]).finally(() => (booting.value = false))
</script>

<template>
  <UiLoading :active="booting" />
  <RouterView />
  <RotateHint />
  <CrashScreen />
</template>

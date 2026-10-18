<script setup lang="ts">
import { CrashScreen } from '@/widgets/crash-screen'
import RotateHint from './ui/RotateHint.vue'
</script>

<template>
  <RouterView />
  <RotateHint />
  <CrashScreen />
</template>

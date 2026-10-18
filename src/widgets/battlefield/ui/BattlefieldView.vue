<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type Phaser from 'phaser'
import { createGame } from '../lib/createGame'

const host = ref<HTMLDivElement>()
let game: Phaser.Game | undefined

onMounted(() => {
  game = createGame(host.value!)
})
onBeforeUnmount(() => game?.destroy(true))
</script>

<template>
  <div ref="host" class="battlefield" data-testid="battlefield" />
</template>

<style scoped>
.battlefield {
  width: 100%;
  height: 100%;
}
</style>

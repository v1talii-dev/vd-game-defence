<script setup lang="ts">
import { ref } from 'vue'
import { BattlefieldView } from '@/widgets/battlefield'
import { BattleHud } from '@/widgets/hud'
import { BuildMenu } from '@/widgets/build-menu'
import { TowerPanel } from '@/widgets/tower-panel'
import { ResultDialog } from '@/widgets/result-dialog'
import { PauseMenu } from '@/widgets/pause-menu'
import { TutorialHints } from '@/widgets/tutorial'

// смена ключа перемонтирует сцену и тем самым перезапускает бой
const runKey = ref(0)
const restart = () => runKey.value++
</script>

<template>
  <div class="battle">
    <BattlefieldView :key="runKey" />
    <div class="ui">
      <BattleHud />
      <BuildMenu />
      <TowerPanel />
      <TutorialHints :key="runKey" />
    </div>
    <PauseMenu @restart="restart" />
    <ResultDialog @restart="restart" />
  </div>
</template>

<style scoped>
.battle {
  position: relative;
  width: 100%;
  height: 100%;
}
/* слой UI не перехватывает ввод, кроме самих виджетов */
.ui {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>

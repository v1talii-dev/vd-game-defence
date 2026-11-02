<script setup lang="ts">
import { ref } from 'vue'
import { BattlefieldView } from '@/widgets/battlefield'
import { BattleHud } from '@/widgets/hud'
import { BuildMenu } from '@/widgets/build-menu'
import { TowerPanel } from '@/widgets/tower-panel'
import { OrderQueue } from '@/widgets/order-queue'
import { ResultDialog } from '@/widgets/result-dialog'
import { PauseMenu } from '@/widgets/pause-menu'
import { KeyHelp } from '@/widgets/key-help'
import { TutorialHints } from '@/widgets/tutorial'

// смена ключа перемонтирует сцену и тем самым перезапускает бой
const props = defineProps<{ levelId: string }>()
// панель очереди заказов временно отключена по решению пользователя (2026-10-23); виджет и тесты остаются
const SHOW_ORDER_QUEUE = false
const battlefield = ref<InstanceType<typeof BattlefieldView> | null>(null)
const projectTower = (x: number, y: number) => battlefield.value?.cellToScreen(x, y) ?? null
const helpOpen = ref(false)
const runKey = ref(0)
const restart = () => runKey.value++
</script>

<template>
  <div class="battle">
    <BattlefieldView
      ref="battlefield"
      :key="`${props.levelId}:${runKey}`"
      :level-id="props.levelId"
    />
    <div class="ui">
      <BattleHud @help="helpOpen = !helpOpen" />
      <BuildMenu />
      <TowerPanel :project="projectTower" />
      <OrderQueue v-if="SHOW_ORDER_QUEUE" />
      <TutorialHints :key="runKey" />
    </div>
    <KeyHelp v-model="helpOpen" />
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

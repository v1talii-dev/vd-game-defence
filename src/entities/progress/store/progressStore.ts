import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { LEVELS, isLevelUnlocked, unlockedTowers } from '@/entities/level'
import { getBrowserStorage } from '../lib/browserStorage'
import { loadSave, withResult, writeSave, type Settings } from '../model/save'

export const useProgressStore = defineStore('progress', () => {
  const storage = getBrowserStorage()
  const loaded = loadSave(storage)
  const levels = ref(loaded.data.levels)
  const settings = ref(loaded.data.settings)
  const tutorialDone = ref(loaded.data.tutorialDone)
  const helpHintSeen = ref(loaded.data.helpHintSeen)
  const storageAvailable = ref(loaded.storageAvailable)

  function persist() {
    writeSave(storage, {
      version: loaded.data.version,
      levels: levels.value,
      settings: settings.value,
      tutorialDone: tutorialDone.value,
      helpHintSeen: helpHintSeen.value,
    })
  }

  function recordResult(levelId: string, stars: number, hp: number, tick?: number) {
    levels.value = withResult(
      { ...loaded.data, levels: levels.value },
      levelId,
      stars,
      hp,
      tick,
    ).levels
    persist()
  }

  function isUnlocked(levelId: string): boolean {
    const l = LEVELS.find((x) => x.id === levelId)
    return !!l && isLevelUnlocked(l, levels.value)
  }
  const towers = computed(() => unlockedTowers(levels.value))

  function updateSettings(partial: Partial<Settings>) {
    settings.value = { ...settings.value, ...partial }
    persist()
  }

  function completeTutorial() {
    tutorialDone.value = true
    persist()
  }

  function markHelpHintSeen() {
    helpHintSeen.value = true
    persist()
  }

  return {
    levels,
    settings,
    tutorialDone,
    helpHintSeen,
    markHelpHintSeen,
    storageAvailable,
    recordResult,
    isUnlocked,
    unlockedTowers: towers,
    updateSettings,
    completeTutorial,
  }
})

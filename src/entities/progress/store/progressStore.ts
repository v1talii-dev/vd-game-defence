import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getBrowserStorage } from '../lib/browserStorage'
import { loadSave, withResult, writeSave, type Settings } from '../model/save'

export const useProgressStore = defineStore('progress', () => {
  const storage = getBrowserStorage()
  const loaded = loadSave(storage)
  const levels = ref(loaded.data.levels)
  const settings = ref(loaded.data.settings)
  const tutorialDone = ref(loaded.data.tutorialDone)
  const storageAvailable = ref(loaded.storageAvailable)

  function persist() {
    writeSave(storage, {
      version: loaded.data.version,
      levels: levels.value,
      settings: settings.value,
      tutorialDone: tutorialDone.value,
    })
  }

  function recordResult(levelId: string, stars: number, hp: number) {
    levels.value = withResult({ ...loaded.data, levels: levels.value }, levelId, stars, hp).levels
    persist()
  }

  function updateSettings(partial: Partial<Settings>) {
    settings.value = { ...settings.value, ...partial }
    persist()
  }

  function completeTutorial() {
    tutorialDone.value = true
    persist()
  }

  return {
    levels,
    settings,
    tutorialDone,
    storageAvailable,
    recordResult,
    updateSettings,
    completeTutorial,
  }
})

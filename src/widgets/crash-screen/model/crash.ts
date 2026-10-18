import { ref, type App } from 'vue'
import { useBattleSession } from '@/entities/battle'

export const crashInfo = ref<{ message: string; stack: string } | null>(null)

function report(err: unknown) {
  // первая ошибка важнее последующих
  if (crashInfo.value) return
  const e = err instanceof Error ? err : new Error(String(err))
  crashInfo.value = { message: e.message, stack: e.stack ?? '' }
  try {
    useBattleSession().paused = true
  } catch {
    // Pinia ещё не готова — паузить нечего
  }
}

// Глобальные перехватчики ошибок (SPEC §3.4)
export function installCrashHandlers(app: App) {
  app.config.errorHandler = (err) => report(err)
  window.addEventListener('error', (e) => report(e.error ?? e.message))
  window.addEventListener('unhandledrejection', (e) => report(e.reason))
}

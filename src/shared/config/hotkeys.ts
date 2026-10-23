// Единая раскладка клавиш: источник для ввода, подсказок и справки (SPEC §4.6)
export type HotkeyAction =
  | 'panUp'
  | 'panDown'
  | 'panLeft'
  | 'panRight'
  | 'prevTower'
  | 'nextTower'
  | 'upgrade'
  | 'sell'
  | 'nextWave'
  | 'pause'
  | 'speed'
  | 'cancel'
  | 'step'
  | 'help'

interface Hotkey {
  /** коды KeyboardEvent.code */
  codes: readonly string[]
  /** подпись клавиш для пользователя */
  label: string
}

export const HOTKEYS: Record<HotkeyAction, Hotkey> = {
  panUp: { codes: ['KeyW', 'ArrowUp'], label: 'W' },
  panDown: { codes: ['KeyS', 'ArrowDown'], label: 'S' },
  panLeft: { codes: ['KeyA', 'ArrowLeft'], label: 'A' },
  panRight: { codes: ['KeyD', 'ArrowRight'], label: 'D' },
  prevTower: { codes: ['KeyQ'], label: 'Q' },
  nextTower: { codes: ['KeyE'], label: 'E' },
  upgrade: { codes: ['KeyR', 'KeyU'], label: 'R / U' },
  sell: { codes: ['KeyX', 'Delete'], label: 'X / Delete' },
  nextWave: { codes: ['Space'], label: 'Пробел' },
  pause: { codes: ['KeyP'], label: 'P' },
  speed: { codes: ['KeyF'], label: 'F' },
  cancel: { codes: ['Escape'], label: 'Esc' },
  step: { codes: ['Period'], label: '.' },
  help: { codes: ['KeyH'], label: 'H' },
}

export const matches = (action: HotkeyAction, code: string): boolean =>
  HOTKEYS[action].codes.includes(code)

export const keyLabel = (action: HotkeyAction): string => HOTKEYS[action].label

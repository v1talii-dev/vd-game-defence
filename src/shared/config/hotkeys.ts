// Единая раскладка клавиш: источник для ввода, подсказок и справки (SPEC §4.6)
export type HotkeyAction =
  | 'panUp'
  | 'panDown'
  | 'panLeft'
  | 'panRight'
  | 'buildSlot'
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
  panUp: { codes: ['KeyW', 'ArrowUp'], label: 'W / ↑' },
  panDown: { codes: ['KeyS', 'ArrowDown'], label: 'S / ↓' },
  panLeft: { codes: ['KeyA', 'ArrowLeft'], label: 'A / ←' },
  panRight: { codes: ['KeyD', 'ArrowRight'], label: 'D / →' },
  buildSlot: {
    codes: Array.from({ length: 9 }, (_, i) => `Digit${i + 1}`),
    label: '1–9',
  },
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

/** Номер слота башни (0-based) по коду цифровой клавиши или null */
export const buildSlotIndex = (code: string): number | null =>
  matches('buildSlot', code) ? Number(code.slice(5)) - 1 : null

/** Группы справки: каждое действие HOTKEYS входит ровно в одну */
export const HOTKEY_GROUPS = {
  camera: ['panUp', 'panDown', 'panLeft', 'panRight'],
  build: ['buildSlot', 'cancel'],
  tower: ['prevTower', 'nextTower', 'upgrade', 'sell'],
  battle: ['nextWave', 'pause', 'speed', 'step', 'help'],
} as const satisfies Record<string, readonly HotkeyAction[]>

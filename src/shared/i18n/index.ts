import { ru } from './ru'

export { ru as t }

// строка по ключу вида 'level.desertBase.name'; неизвестный ключ возвращается как есть
export function tr(key: string): string {
  let cur: unknown = ru
  for (const part of key.split('.')) cur = (cur as Record<string, unknown> | undefined)?.[part]
  return typeof cur === 'string' ? cur : key
}

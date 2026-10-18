export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogTag = 'sim' | 'render' | 'input' | 'save'

const RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

/** В prod выводятся только warn и error */
export function minLevel(prod: boolean = import.meta.env.PROD): LogLevel {
  return prod ? 'warn' : 'debug'
}

export function createLogger(tag: LogTag, min: LogLevel = minLevel()) {
  const out =
    (level: LogLevel) =>
    (...args: unknown[]) => {
      if (RANK[level] >= RANK[min]) console[level](`[${tag}]`, ...args)
    }
  return { debug: out('debug'), info: out('info'), warn: out('warn'), error: out('error') }
}

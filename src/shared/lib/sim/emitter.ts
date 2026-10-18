export type Handler<E> = (event: E) => void

export interface Emitter<E extends { type: string }> {
  on<T extends E['type']>(type: T, handler: Handler<Extract<E, { type: T }>>): () => void
  emit(event: E): void
}

export function createEmitter<E extends { type: string }>(): Emitter<E> {
  const handlers = new Map<string, Set<Handler<never>>>()
  return {
    on(type, handler) {
      const set = handlers.get(type) ?? new Set()
      handlers.set(type, set)
      set.add(handler as Handler<never>)
      return () => set.delete(handler as Handler<never>)
    },
    emit(event) {
      handlers.get(event.type)?.forEach((h) => (h as Handler<E>)(event))
    },
  }
}

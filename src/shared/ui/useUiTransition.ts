import { onBeforeUnmount } from 'vue'
import { gsap } from 'gsap'

export function useUiTransition(target: (element: Element) => Element = (element) => element) {
  const active = new Map<Element, () => void>()

  function stop(element: Element) {
    active.get(element)?.()
  }

  function animate(element: Element, done: () => void, leaving: boolean) {
    stop(element)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      done()
      return
    }
    const root = element as HTMLElement
    const pointerEvents = root.style.pointerEvents
    const inert = root.inert
    if (leaving) {
      root.style.pointerEvents = 'none'
      root.inert = true
    }
    const context = gsap.context(() => {})
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      active.delete(element)
      context.revert()
      root.style.pointerEvents = pointerEvents
      root.inert = inert
      done()
    }
    active.set(element, finish)
    context.add(() => {
      gsap.fromTo(
        target(element),
        { opacity: leaving ? 1 : 0, y: leaving ? 0 : 12 },
        {
          opacity: leaving ? 0 : 1,
          y: leaving ? 8 : 0,
          duration: leaving ? 0.15 : 0.2,
          ease: 'power2.out',
          onComplete: finish,
        },
      )
    })
  }

  onBeforeUnmount(() => {
    for (const finish of active.values()) finish()
  })

  return {
    onEnter: (element: Element, done: () => void) => animate(element, done, false),
    onLeave: (element: Element, done: () => void) => animate(element, done, true),
    onEnterCancelled: stop,
    onLeaveCancelled: stop,
  }
}

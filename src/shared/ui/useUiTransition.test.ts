// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { gsap } from 'gsap'
import { useUiTransition } from './useUiTransition'

const Host = defineComponent({
  props: { open: Boolean },
  setup() {
    return { motion: useUiTransition((element) => element.querySelector('.content')!) }
  },
  template:
    '<Transition :css="false" v-bind="motion"><aside v-if="open" style="left: 42px"><div class="content"><button>Кнопка</button></div></aside></Transition>',
})
let wrapper: ReturnType<typeof mount> | undefined
let reduced = false
beforeEach(() => {
  reduced = false
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduced })),
  )
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.unstubAllGlobals()
})

it('animates inner content and keeps a reopened panel interactive while the previous panel leaves', async () => {
  wrapper = mount(Host, {
    props: { open: false },
    attachTo: document.body,
    global: { stubs: { transition: false } },
  })
  await wrapper.setProps({ open: true })
  const root = wrapper.get('aside').element as HTMLElement
  const content = wrapper.get('.content').element as HTMLElement
  gsap.getTweensOf(content)[0]!.pause().progress(1)
  expect(root.style.left).toBe('42px')
  expect(root.style.transform).toBe('')
  await wrapper.setProps({ open: false })
  const leave = gsap.getTweensOf(content)[0]!
  leave.pause().progress(0.5)
  expect(root.inert).toBe(true)
  expect(root.style.pointerEvents).toBe('none')
  await wrapper.setProps({ open: true })
  const currentRoot = wrapper.get('aside').element as HTMLElement
  expect(currentRoot).not.toBe(root)
  expect(currentRoot.style.pointerEvents).toBe('')
  expect(currentRoot.inert).toBeFalsy()
  const current = wrapper.get('.content').element
  gsap.getTweensOf(current)[0]!.pause().progress(1)
  leave.progress(1)
  await nextTick()
  expect((current as HTMLElement).style.opacity).toBe('')
  expect((current as HTMLElement).style.transform).toBe('')
  expect(document.querySelectorAll('aside')).toHaveLength(1)
})

it('cleans a leaving element and its tween on unmount', async () => {
  wrapper = mount(Host, {
    props: { open: true },
    attachTo: document.body,
    global: { stubs: { transition: false } },
  })
  const content = wrapper.get('.content').element as HTMLElement
  await wrapper.setProps({ open: false })
  gsap.getTweensOf(content)[0]!.pause().progress(0.5)
  wrapper.unmount()
  wrapper = undefined
  expect(content.isConnected).toBe(false)
  expect(gsap.getTweensOf(content)).toHaveLength(0)
  expect(content.style.opacity).toBe('')
  expect(content.style.transform).toBe('')
})

it('skips both enter and leave for reduced motion', async () => {
  reduced = true
  wrapper = mount(Host, {
    props: { open: false },
    attachTo: document.body,
    global: { stubs: { transition: false } },
  })
  await wrapper.setProps({ open: true })
  const content = wrapper.get('.content').element
  expect(gsap.getTweensOf(content)).toHaveLength(0)
  await wrapper.setProps({ open: false })
  await nextTick()
  expect(content.isConnected).toBe(false)
})

it('settles cancelled hooks once and cleans simultaneous animations on unmount', () => {
  wrapper = mount(Host, {
    props: { open: true },
    attachTo: document.body,
    global: { stubs: { transition: false } },
  })
  const hooks = (wrapper.vm as unknown as { motion: ReturnType<typeof useUiTransition> }).motion
  const first = wrapper.get('aside').element
  const second = first.cloneNode(true) as HTMLElement
  document.body.append(second)
  const cancelled = vi.fn()
  const unmounted = vi.fn()
  hooks.onLeave(first, cancelled)
  hooks.onEnter(second, unmounted)
  hooks.onLeaveCancelled(first)
  hooks.onLeaveCancelled(first)
  expect(cancelled).toHaveBeenCalledTimes(1)
  expect(gsap.getTweensOf(first.querySelector('.content'))).toHaveLength(0)
  wrapper.unmount()
  wrapper = undefined
  expect(unmounted).toHaveBeenCalledTimes(1)
  expect(gsap.getTweensOf(second.querySelector('.content'))).toHaveLength(0)
  second.remove()
})

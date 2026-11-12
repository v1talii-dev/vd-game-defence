// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gsap } from 'gsap'
import CampaignPage from './CampaignPage.vue'

const card = '[data-testid=level-card-desert-base]'
const briefing = '[data-testid=level-briefing-screen]'
let wrapper: ReturnType<typeof mount> | undefined
let reducedMotion = false

async function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/campaign', component: CampaignPage },
      { path: '/battle/:levelId', component: { template: '<div />' } },
      { path: '/', component: { template: '<div />' } },
    ],
  })
  await router.push('/campaign?locked=1')
  await router.isReady()
  const page = mount(CampaignPage, {
    attachTo: document.body,
    global: {
      plugins: [createPinia(), router],
      stubs: { transition: false },
    },
  })
  wrapper = page
  return { page, router }
}

async function openBriefing(page: ReturnType<typeof mount>) {
  await page.get(card).trigger('click')
  return page.get(briefing).element as HTMLElement
}

describe('CampaignPage: briefing transition', () => {
  beforeEach(() => {
    localStorage.clear()
    reducedMotion = false
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: reducedMotion,
        media: query,
      })),
    )
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('animates the briefing, restores styles and preserves focus and the battle route', async () => {
    const { page, router } = await renderPage()
    expect(page.find('[role=status]').exists()).toBe(true)

    const panel = await openBriefing(page)
    expect(page.find('[data-testid=level-list]').exists()).toBe(false)
    expect(page.find('[role=status]').exists()).toBe(false)

    const tweens = gsap.getTweensOf(panel)
    expect(tweens).toHaveLength(1)
    const tween = tweens[0]!
    tween.pause().progress(0.5)
    expect(Number(panel.style.opacity)).toBeGreaterThan(0)
    expect(Number(panel.style.opacity)).toBeLessThan(1)
    expect(panel.style.transform).not.toBe('')

    const start = page.get('[data-testid=level-start]')
    ;(start.element as HTMLElement).focus()
    tween.progress(1)

    expect(document.activeElement).toBe(start.element)
    expect(panel.style.opacity).toBe('')
    expect(panel.style.transform).toBe('')
    expect(gsap.getTweensOf(panel)).toHaveLength(0)
    expect(start.attributes('href')).toBe('/battle/desert-base')

    await start.trigger('click')
    await vi.waitFor(() => {
      expect(router.currentRoute.value.path).toBe('/battle/desert-base')
    })
  })

  it('cancels an unfinished enter, removes the panel immediately and can reopen', async () => {
    const { page } = await renderPage()
    const panel = await openBriefing(page)
    const tween = gsap.getTweensOf(panel)[0]!
    tween.pause().progress(0.5)

    await page.get('[data-testid=level-back]').trigger('click')

    expect(panel.isConnected).toBe(false)
    expect(document.querySelector(briefing)).toBeNull()
    expect(page.find('[data-testid=level-list]').exists()).toBe(true)
    expect(page.find('[role=status]').exists()).toBe(true)
    expect(gsap.getTweensOf(panel)).toHaveLength(0)
    expect(panel.style.opacity).toBe('')
    expect(panel.style.transform).toBe('')

    const reopened = await openBriefing(page)
    expect(reopened).not.toBe(panel)
    expect(document.querySelectorAll(briefing)).toHaveLength(1)
    const nextTween = gsap.getTweensOf(reopened)[0]!
    nextTween.pause().progress(1)
    await page.get('[data-testid=level-back]').trigger('click')
    expect(document.querySelector(briefing)).toBeNull()
  })

  it('cleans an active animation and detached panel on unmount', async () => {
    const { page } = await renderPage()
    const panel = await openBriefing(page)
    gsap.getTweensOf(panel)[0]!.pause().progress(0.5)

    page.unmount()
    wrapper = undefined

    expect(panel.isConnected).toBe(false)
    expect(document.querySelector(briefing)).toBeNull()
    expect(gsap.getTweensOf(panel)).toHaveLength(0)
    expect(panel.style.opacity).toBe('')
    expect(panel.style.transform).toBe('')
  })

  it('shows reduced-motion content immediately without a tween and still closes', async () => {
    reducedMotion = true
    const { page } = await renderPage()
    const panel = await openBriefing(page)

    expect(panel.isConnected).toBe(true)
    expect(gsap.getTweensOf(panel)).toHaveLength(0)
    expect(panel.style.opacity).toBe('')
    expect(panel.style.transform).toBe('')

    await page.get('[data-testid=level-back]').trigger('click')

    expect(panel.isConnected).toBe(false)
    expect(document.querySelector(briefing)).toBeNull()
    expect(page.find('[data-testid=level-list]').exists()).toBe(true)
  })
})

import { createRouter, createWebHashHistory } from 'vue-router'
import { getLevel } from '@/entities/level'
import { useProgressStore } from '@/entities/progress'
import { CampaignPage } from '@/pages/campaign'
import { MainMenuPage } from '@/pages/main-menu'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'menu', component: MainMenuPage },
    // старый путь ведёт на первый уровень, query (seed, wave…) сохраняется
    { path: '/battle', redirect: (to) => ({ path: '/battle/desert-base', query: to.query }) },
    {
      path: '/battle/:levelId',
      name: 'battle',
      component: () => import('@/pages/battle'),
      props: true,
    },
    { path: '/campaign', name: 'campaign', component: CampaignPage },
    { path: '/settings', name: 'settings', component: () => import('@/pages/settings') },
  ],
})

// неизвестный, закрытый или нереализованный уровень — на экран кампании с сообщением;
// beforeEach, а не beforeEnter: тот не срабатывает при смене только :levelId
router.beforeEach((to) => {
  if (to.name !== 'battle') return true
  try {
    const level = getLevel(String(to.params.levelId))
    if (level.implemented && useProgressStore().isUnlocked(level.id)) return true
  } catch {
    // неизвестный id — ниже редирект
  }
  return { path: '/campaign', query: { locked: '1' } }
})

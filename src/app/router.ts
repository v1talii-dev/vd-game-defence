import { createRouter, createWebHashHistory } from 'vue-router'
import { getLevel } from '@/entities/level'
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
      // неизвестный уровень — в меню (экран кампании появится в C4; закрытые уровни — там же)
      beforeEnter: (to) => {
        try {
          getLevel(String(to.params.levelId))
          return true
        } catch {
          return '/'
        }
      },
    },
    { path: '/settings', name: 'settings', component: () => import('@/pages/settings') },
  ],
})

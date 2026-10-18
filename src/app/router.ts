import { createRouter, createWebHashHistory } from 'vue-router'
import { MainMenuPage } from '@/pages/main-menu'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'menu', component: MainMenuPage },
    { path: '/battle', name: 'battle', component: () => import('@/pages/battle') },
    { path: '/settings', name: 'settings', component: () => import('@/pages/settings') },
  ],
})

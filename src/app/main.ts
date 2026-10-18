import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { installCrashHandlers } from '@/widgets/crash-screen'
import App from './App.vue'
import { router } from './router'
import './styles/global.css'

const app = createApp(App).use(createPinia()).use(router)
installCrashHandlers(app)
app.mount('#app')

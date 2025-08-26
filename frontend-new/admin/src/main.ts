import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

import App from './App.vue'
import router from './router'
import { useApiClient } from './composables/useApiClient'

// 创建Vue应用
const app = createApp(App)

// 注册Pinia状态管理
app.use(createPinia())

// 注册Element Plus
app.use(ElementPlus)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 注册路由
app.use(router)

// 初始化API客户端
const { initializeApiClient } = useApiClient()
initializeApiClient()

// 挂载应用
app.mount('#app')

// 开发环境下的调试信息
if (import.meta.env.DEV) {
  console.log('🚀 Rocket Admin Panel - Development Mode')
  console.log('📊 Element Plus loaded')
  console.log('🛠 Router configured')
  console.log('📦 Pinia store ready')
}
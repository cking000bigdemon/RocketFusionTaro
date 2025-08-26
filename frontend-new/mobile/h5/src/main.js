/**
 * Vue3 移动端H5应用入口文件
 */
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './stores'

// 导入Vant样式
import 'vant/lib/index.css'
// 移动端适配
import '@vant/touch-emulator'

// 导入全局样式
import './styles/variables.scss'

// 导入共享工具
import { ApiClient } from '@shared/api/ApiClient.js'
import { initRouterHandler } from './utils/RouterHandler.js'

// 创建Vue应用实例
const app = createApp(App)

// 安装插件
app.use(pinia)
app.use(router)

// 初始化RouterHandler
const routerHandler = initRouterHandler(router, pinia)

// 创建API客户端实例
const apiClient = new ApiClient(routerHandler)

// 设置API客户端的RouterHandler
apiClient.setRouterHandler(routerHandler)

// 全局提供ApiClient实例
app.provide('apiClient', apiClient)

// 全局错误处理
app.config.errorHandler = (error, instance, info) => {
  console.error('Global error:', error, info)
  
  // 上报错误到后端
  routerHandler.reportError({
    type: 'vue',
    message: error.message,
    stack: error.stack,
    componentTrace: info
  })
}

// 全局属性
app.config.globalProperties.$api = apiClient
app.config.globalProperties.$routerHandler = routerHandler

// 挂载应用
app.mount('#app')

// 开发环境下的调试工具
if (import.meta.env.MODE === 'development') {
  // 将一些实例暴露到全局，方便调试
  window.__VUE_APP__ = app
  window.__ROUTER__ = router
  window.__PINIA__ = pinia
  window.__API_CLIENT__ = apiClient
  window.__ROUTER_HANDLER__ = routerHandler
  
  console.log('🚀 Rocket Mobile H5 App started in development mode')
  console.log('Debug tools available:', {
    app: window.__VUE_APP__,
    router: window.__ROUTER__,
    pinia: window.__PINIA__,
    api: window.__API_CLIENT__,
    routerHandler: window.__ROUTER_HANDLER__
  })
}
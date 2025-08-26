/**
 * Vue Router配置
 * 移动端H5路由配置，结合后端驱动路由系统
 */
import { createRouter, createWebHistory } from 'vue-router'
import { getRouterHandler } from '../utils/RouterHandler.js'

// 路由组件懒加载  
const Login = () => import('../views/Login.vue')
const Home = () => import('../views/Home.vue')
const Profile = () => import('../views/Profile.vue')
const UserData = () => import('../views/UserData.vue')
const NotFound = () => import('../views/NotFound.vue')

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      title: '用户登录',
      requiresAuth: false,
      keepAlive: false
    }
  },
  {
    path: '/home',
    name: 'Home',
    component: Home,
    meta: {
      title: '首页',
      requiresAuth: true,
      keepAlive: true
    }
  },
  {
    path: '/profile',
    name: 'Profile', 
    component: Profile,
    meta: {
      title: '个人中心',
      requiresAuth: true,
      keepAlive: false
    }
  },
  {
    path: '/user-data',
    name: 'UserData',
    component: UserData,
    meta: {
      title: '用户数据',
      requiresAuth: true,
      keepAlive: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: {
      title: '页面不存在',
      requiresAuth: false
    }
  }
]

const router = createRouter({
  history: createWebHistory('/'),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 路由切换时的滚动行为
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return { el: to.hash }
    } else {
      return { top: 0 }
    }
  }
})

// 全局前置守卫
router.beforeEach(async (to, from, next) => {
  // 设置页面标题
  const title = to.meta?.title || 'Rocket移动端'
  document.title = title

  // 显示加载状态（可选）
  const routerHandler = getRouterHandler()
  const platformAdapter = routerHandler?.platformAdapter
  
  if (platformAdapter) {
    await platformAdapter.setPageTitle(title)
  }

  // 身份验证检查
  const requiresAuth = to.meta?.requiresAuth
  const isAuthenticated = checkAuthStatus()

  if (requiresAuth && !isAuthenticated) {
    // 未认证用户访问需要认证的页面
    if (to.path !== '/login') {
      // 保存原本要访问的页面
      sessionStorage.setItem('redirectPath', to.fullPath)
      next('/login')
      return
    }
  } else if (!requiresAuth && isAuthenticated && to.path === '/login') {
    // 已认证用户访问登录页面，重定向到首页
    // 但如果是后端驱动路由正在执行，则不干扰
    if (!window.__ROUTER_HANDLER_EXECUTING__) {
      next('/home')
      return
    }
  }

  next()
})

// 全局后置钩子
router.afterEach((to, from, failure) => {
  if (failure) {
    console.error('Route navigation failed:', failure)
    return
  }

  // 路由切换成功后的处理
  const routerHandler = getRouterHandler()
  if (routerHandler && routerHandler.debugMode) {
    console.log(`✅ Route navigated: ${from.path} → ${to.path}`)
  }

  // 清除加载状态
  const platformAdapter = routerHandler?.platformAdapter
  if (platformAdapter) {
    platformAdapter.hideLoading()
  }

  // 埋点统计（如果需要）
  trackPageView(to)
})

/**
 * 检查用户认证状态
 * @returns {boolean}
 */
function checkAuthStatus() {
  // 从localStorage或store中检查认证状态
  const token = localStorage.getItem('auth_token')
  const user = localStorage.getItem('user_info')
  
  return !!(token && user)
}

/**
 * 页面访问统计
 * @param {Object} route - 路由对象
 */
function trackPageView(route) {
  // 这里可以添加页面访问统计逻辑
  if (import.meta.env.MODE === 'production') {
    // 发送统计数据到后端或第三方分析服务
    console.log('Track page view:', {
      path: route.path,
      name: route.name,
      title: route.meta?.title,
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * 动态添加路由
 * @param {Array} newRoutes - 新路由配置
 */
export function addRoutes(newRoutes) {
  newRoutes.forEach(route => {
    router.addRoute(route)
  })
}

/**
 * 移除路由
 * @param {string} routeName - 路由名称
 */
export function removeRoute(routeName) {
  router.removeRoute(routeName)
}

/**
 * 获取所有路由
 * @returns {Array}
 */
export function getRoutes() {
  return router.getRoutes()
}

/**
 * 检查路由是否存在
 * @param {string} path - 路径
 * @returns {boolean}
 */
export function hasRoute(path) {
  const resolved = router.resolve(path)
  return resolved.matched.length > 0
}

export default router
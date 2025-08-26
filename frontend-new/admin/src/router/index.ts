import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// 配置进度条
NProgress.configure({ 
  showSpinner: false,
  minimum: 0.2,
  speed: 500
})

// 路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: {
      title: '登录',
      requiresAuth: false,
      hideInMenu: true
    }
  },
  {
    path: '/',
    redirect: '/dashboard',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: {
          title: '仪表板',
          icon: 'Odometer',
          requiresAuth: true
        }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/Users.vue'),
        meta: {
          title: '用户管理',
          icon: 'User',
          requiresAuth: true
        }
      },
      {
        path: 'user-data',
        name: 'UserData',
        component: () => import('@/views/UserData.vue'),
        meta: {
          title: '用户数据',
          icon: 'DataAnalysis',
          requiresAuth: true
        }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: {
          title: '系统设置',
          icon: 'Setting',
          requiresAuth: true
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: '页面不存在',
      hideInMenu: true
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 全局前置守卫
router.beforeEach(async (to, from, next) => {
  NProgress.start()
  
  // 设置页面标题
  const title = to.meta?.title as string
  if (title) {
    document.title = `${title} - Rocket 管理后台`
  }
  
  const authStore = useAuthStore()
  
  // 检查路由是否需要认证
  if (to.meta?.requiresAuth !== false) {
    // 需要认证的路由
    if (!authStore.isAuthenticated) {
      // 未登录，跳转到登录页
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
      return
    }
  } else {
    // 不需要认证的路由
    if (to.name === 'Login' && authStore.isAuthenticated) {
      // 已登录用户访问登录页，跳转到仪表板
      next({ path: '/dashboard' })
      return
    }
  }
  
  next()
})

// 全局后置守卫
router.afterEach(() => {
  NProgress.done()
})

// 路由错误处理
router.onError((error) => {
  console.error('Router Error:', error)
  NProgress.done()
})

export default router
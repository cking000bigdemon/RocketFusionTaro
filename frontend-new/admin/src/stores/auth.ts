import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useApiClient } from '@/composables/useApiClient'

interface AdminUser {
  id: number
  username: string
  email: string
  is_admin: boolean
  created_at: string
  last_login?: string
}

interface LoginForm {
  username: string
  password: string
  remember_me: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const { apiClient } = useApiClient()
  const router = useRouter()

  // 状态
  const user = ref<AdminUser | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)

  // 计算属性
  const isAuthenticated = computed(() => !!user.value && !!token.value)
  const isAdmin = computed(() => user.value?.is_admin || false)

  // 初始化认证状态
  const initializeAuth = async () => {
    const savedToken = localStorage.getItem('admin_token')
    if (savedToken) {
      token.value = savedToken
      apiClient.setAdminAuth(savedToken)
      
      try {
        await fetchUserInfo()
      } catch (error) {
        console.error('Failed to restore auth state:', error)
        clearAuth()
      }
    }
  }

  // 登录
  const login = async (loginForm: LoginForm) => {
    loading.value = true
    
    try {
      const response = await apiClient.adminLogin({
        username: loginForm.username,
        password: loginForm.password,
        remember_me: loginForm.remember_me
      })

      if (response.code === 200 && response.data) {
        // 保存认证信息
        token.value = response.data.session_token
        user.value = response.data.user
        
        // 保存到本地存储
        if (loginForm.remember_me) {
          localStorage.setItem('admin_token', response.data.session_token)
        } else {
          sessionStorage.setItem('admin_token', response.data.session_token)
        }
        
        // 设置API客户端认证
        // apiClient.setAdminAuth(response.data.session_token)
        
        ElMessage.success('登录成功')
        
        // 跳转到仪表板或之前访问的页面
        const redirectPath = router.currentRoute.value.query.redirect as string
        await router.push(redirectPath || '/dashboard')
        
        return { success: true }
      } else {
        ElMessage.error(response.message || '登录失败')
        return { success: false, message: response.message }
      }
    } catch (error: any) {
      console.error('Login failed:', error)
      const message = error.response?.data?.message || error.message || '登录失败，请重试'
      ElMessage.error(message)
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  // 登出
  const logout = async (showMessage = true) => {
    loading.value = true
    
    try {
      // 调用后端登出接口
      if (token.value) {
        await apiClient.adminLogout()
      }
    } catch (error) {
      console.error('Logout request failed:', error)
      // 即使后端请求失败，也要清除本地状态
    } finally {
      clearAuth()
      
      if (showMessage) {
        ElMessage.success('已成功登出')
      }
      
      // 跳转到登录页
      await router.push('/login')
      loading.value = false
    }
  }

  // 获取用户信息
  const fetchUserInfo = async () => {
    if (!token.value) {
      throw new Error('No token available')
    }

    try {
      const response = await apiClient.getAdminInterceptor().get('/auth/me')
      
      if (response.code === 200 && response.data) {
        user.value = response.data
        return response.data
      } else {
        throw new Error(response.message || 'Failed to fetch user info')
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error)
      throw error
    }
  }

  // 更新用户信息
  const updateUserInfo = (newUserInfo: Partial<AdminUser>) => {
    if (user.value) {
      user.value = { ...user.value, ...newUserInfo }
    }
  }

  // 清除认证状态
  const clearAuth = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('admin_token')
    sessionStorage.removeItem('admin_token')
    apiClient.setAdminAuth(null)
  }

  // 检查权限
  const hasPermission = (permission: string) => {
    if (!user.value) return false
    
    // 管理员拥有所有权限
    if (user.value.is_admin) return true
    
    // 这里可以扩展更复杂的权限检查逻辑
    return false
  }

  return {
    // 状态
    user: readonly(user),
    token: readonly(token),
    loading: readonly(loading),
    
    // 计算属性
    isAuthenticated,
    isAdmin,
    
    // 方法
    initializeAuth,
    login,
    logout,
    fetchUserInfo,
    updateUserInfo,
    clearAuth,
    hasPermission
  }
})
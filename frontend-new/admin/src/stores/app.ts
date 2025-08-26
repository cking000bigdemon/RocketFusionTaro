import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { ElMessage } from 'element-plus'
import { useApiClient } from '@/composables/useApiClient'

interface SystemStats {
  total_users: number
  active_users: number
  total_data_entries: number
  system_uptime: string
  memory_usage: number
  cpu_usage: number
  disk_usage: number
}

interface SystemConfig {
  app_name: string
  version: string
  environment: string
  database_status: string
  redis_status: string
}

export const useAppStore = defineStore('app', () => {
  const { apiClient } = useApiClient()

  // 状态
  const systemStats = ref<SystemStats | null>(null)
  const systemConfig = ref<SystemConfig | null>(null)
  const loading = ref(false)
  const sidebarCollapsed = ref(false)
  const theme = ref<'light' | 'dark'>('light')

  // 计算属性
  const isDarkTheme = computed(() => theme.value === 'dark')
  const systemHealthy = computed(() => {
    if (!systemConfig.value) return false
    return systemConfig.value.database_status === 'connected' && 
           systemConfig.value.redis_status === 'connected'
  })

  // 初始化应用
  const initialize = async () => {
    loading.value = true
    
    try {
      // 并行获取系统配置和统计信息
      await Promise.allSettled([
        fetchSystemConfig(),
        fetchSystemStats()
      ])
      
      // 恢复主题设置
      const savedTheme = localStorage.getItem('admin_theme') as 'light' | 'dark'
      if (savedTheme) {
        setTheme(savedTheme)
      }
      
      // 恢复侧边栏状态
      const savedSidebarState = localStorage.getItem('admin_sidebar_collapsed')
      if (savedSidebarState !== null) {
        sidebarCollapsed.value = JSON.parse(savedSidebarState)
      }
      
    } catch (error) {
      console.error('Failed to initialize app:', error)
    } finally {
      loading.value = false
    }
  }

  // 获取系统统计信息
  const fetchSystemStats = async () => {
    try {
      const response = await apiClient.adminGetSystemStats()
      
      if (response.code === 200 && response.data) {
        systemStats.value = response.data
        return response.data
      } else {
        console.error('Failed to fetch system stats:', response.message)
        return null
      }
    } catch (error) {
      console.error('Failed to fetch system stats:', error)
      return null
    }
  }

  // 获取系统配置
  const fetchSystemConfig = async () => {
    try {
      const response = await apiClient.getSystemConfig()
      
      if (response.code === 200 && response.data) {
        systemConfig.value = response.data
        return response.data
      } else {
        console.error('Failed to fetch system config:', response.message)
        return null
      }
    } catch (error) {
      console.error('Failed to fetch system config:', error)
      return null
    }
  }

  // 设置主题
  const setTheme = (newTheme: 'light' | 'dark') => {
    theme.value = newTheme
    
    // 更新HTML类名
    const htmlElement = document.documentElement
    if (newTheme === 'dark') {
      htmlElement.classList.add('dark')
    } else {
      htmlElement.classList.remove('dark')
    }
    
    // 保存到本地存储
    localStorage.setItem('admin_theme', newTheme)
  }

  // 切换主题
  const toggleTheme = () => {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  // 切换侧边栏
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem('admin_sidebar_collapsed', JSON.stringify(sidebarCollapsed.value))
  }

  // 设置侧边栏状态
  const setSidebarCollapsed = (collapsed: boolean) => {
    sidebarCollapsed.value = collapsed
    localStorage.setItem('admin_sidebar_collapsed', JSON.stringify(collapsed))
  }

  // 显示成功消息
  const showSuccess = (message: string) => {
    ElMessage.success(message)
  }

  // 显示错误消息
  const showError = (message: string) => {
    ElMessage.error(message)
  }

  // 显示警告消息
  const showWarning = (message: string) => {
    ElMessage.warning(message)
  }

  // 显示信息消息
  const showInfo = (message: string) => {
    ElMessage.info(message)
  }

  // 刷新系统数据
  const refreshSystemData = async () => {
    const loadingInstance = ElMessage({
      message: '正在刷新系统数据...',
      type: 'info',
      duration: 0
    })
    
    try {
      await Promise.all([
        fetchSystemConfig(),
        fetchSystemStats()
      ])
      
      loadingInstance.close()
      ElMessage.success('系统数据已刷新')
    } catch (error) {
      loadingInstance.close()
      ElMessage.error('刷新系统数据失败')
    }
  }

  return {
    // 状态
    systemStats: readonly(systemStats),
    systemConfig: readonly(systemConfig),
    loading: readonly(loading),
    sidebarCollapsed: readonly(sidebarCollapsed),
    theme: readonly(theme),
    
    // 计算属性
    isDarkTheme,
    systemHealthy,
    
    // 方法
    initialize,
    fetchSystemStats,
    fetchSystemConfig,
    setTheme,
    toggleTheme,
    toggleSidebar,
    setSidebarCollapsed,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    refreshSystemData
  }
})
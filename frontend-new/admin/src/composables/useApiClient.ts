import { ref, readonly } from 'vue'
import { ApiClient } from '@shared/api/ApiClient.js'

// 创建全局API客户端实例
let apiClientInstance: ApiClient | null = null

export function useApiClient() {
  const initialized = ref(false)

  // 初始化API客户端（单例模式）
  const initializeApiClient = () => {
    if (!apiClientInstance) {
      // 注意：管理端不需要RouterHandler，所以传入null
      apiClientInstance = new ApiClient(null)
      initialized.value = true
      
      if (import.meta.env.DEV) {
        console.log('🌐 Admin API Client initialized')
      }
    }
    
    return apiClientInstance
  }

  // 获取API客户端实例
  const getApiClient = () => {
    if (!apiClientInstance) {
      throw new Error('API Client not initialized. Call initializeApiClient() first.')
    }
    return apiClientInstance
  }

  return {
    apiClient: apiClientInstance || initializeApiClient(),
    initialized: readonly(initialized),
    initializeApiClient,
    getApiClient
  }
}

// 提供全局访问方法
export const getGlobalApiClient = () => {
  if (!apiClientInstance) {
    throw new Error('API Client not initialized')
  }
  return apiClientInstance
}
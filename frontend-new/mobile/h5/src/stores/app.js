/**
 * 应用全局状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  // 状态
  const settings = ref({
    theme: 'light',
    language: 'zh-CN',
    notifications: true,
    autoLogin: false
  })
  
  const cache = ref({})
  const isLoading = ref(false)
  const networkStatus = ref({
    online: navigator.onLine,
    type: 'unknown'
  })

  // 计算属性
  const isDarkMode = computed(() => settings.value.theme === 'dark')
  const isOnline = computed(() => networkStatus.value.online)

  // Actions - 配合RouterHandler的ProcessData指令

  /**
   * 设置应用配置
   * @param {Object} newSettings - 新的配置
   */
  function setSettings(newSettings) {
    settings.value = { ...settings.value, ...newSettings }
    localStorage.setItem('app_settings', JSON.stringify(settings.value))
  }

  /**
   * 更新应用配置
   * @param {Object} partialSettings - 部分配置
   */
  function updateSettings(partialSettings) {
    settings.value = { ...settings.value, ...partialSettings }
    localStorage.setItem('app_settings', JSON.stringify(settings.value))
  }

  /**
   * 更新缓存数据
   * @param {Object} cacheData - 缓存数据
   */
  function updateCache(cacheData) {
    if (typeof cacheData === 'object') {
      cache.value = { ...cache.value, ...cacheData }
    }
  }

  /**
   * 设置特定缓存项
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 生存时间(秒)
   */
  function setCacheItem(key, value, ttl = null) {
    const cacheItem = {
      value,
      timestamp: Date.now(),
      ttl: ttl ? Date.now() + ttl * 1000 : null
    }
    cache.value[key] = cacheItem
  }

  /**
   * 获取缓存项
   * @param {string} key - 缓存键
   * @returns {any|null}
   */
  function getCacheItem(key) {
    const item = cache.value[key]
    if (!item) return null

    // 检查是否过期
    if (item.ttl && Date.now() > item.ttl) {
      delete cache.value[key]
      return null
    }

    return item.value
  }

  /**
   * 清除过期缓存
   */
  function cleanExpiredCache() {
    const now = Date.now()
    Object.keys(cache.value).forEach(key => {
      const item = cache.value[key]
      if (item.ttl && now > item.ttl) {
        delete cache.value[key]
      }
    })
  }

  /**
   * 清除所有缓存
   */
  function clearCache() {
    cache.value = {}
  }

  /**
   * 设置加载状态
   * @param {boolean} loading - 是否加载中
   */
  function setLoading(loading) {
    isLoading.value = loading
  }

  /**
   * 更新网络状态
   * @param {Object} status - 网络状态
   */
  function setNetworkStatus(status) {
    networkStatus.value = { ...networkStatus.value, ...status }
  }

  /**
   * 切换主题
   */
  function toggleTheme() {
    const newTheme = settings.value.theme === 'light' ? 'dark' : 'light'
    updateSettings({ theme: newTheme })
    
    // 更新CSS变量或类名
    updateThemeClass(newTheme)
  }

  /**
   * 更新主题类名
   * @param {string} theme - 主题名称
   */
  function updateThemeClass(theme) {
    const html = document.documentElement
    html.classList.remove('theme-light', 'theme-dark')
    html.classList.add(`theme-${theme}`)
  }

  /**
   * 设置语言
   * @param {string} lang - 语言代码
   */
  function setLanguage(lang) {
    updateSettings({ language: lang })
    // 这里可以触发i18n语言切换
  }

  /**
   * 从本地存储恢复设置
   */
  function restoreSettings() {
    try {
      const stored = localStorage.getItem('app_settings')
      if (stored) {
        const parsedSettings = JSON.parse(stored)
        settings.value = { ...settings.value, ...parsedSettings }
        
        // 应用主题
        updateThemeClass(settings.value.theme)
      }
    } catch (error) {
      console.error('Failed to restore settings:', error)
    }
  }

  /**
   * 重置所有设置
   */
  function resetSettings() {
    settings.value = {
      theme: 'light',
      language: 'zh-CN',
      notifications: true,
      autoLogin: false
    }
    localStorage.removeItem('app_settings')
    updateThemeClass('light')
  }

  /**
   * 获取应用信息
   * @returns {Object}
   */
  function getAppInfo() {
    return {
      version: '1.0.0',
      platform: 'h5',
      buildTime: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
      environment: import.meta.env.MODE || 'development'
    }
  }

  /**
   * 监听网络状态变化
   */
  function initNetworkMonitoring() {
    const updateOnlineStatus = () => {
      setNetworkStatus({ online: navigator.onLine })
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // 监听连接类型变化（如果支持）
    if (navigator.connection) {
      const updateConnectionInfo = () => {
        setNetworkStatus({
          online: navigator.onLine,
          type: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt
        })
      }

      navigator.connection.addEventListener('change', updateConnectionInfo)
      updateConnectionInfo() // 初始化
    }
  }

  // 初始化
  restoreSettings()
  initNetworkMonitoring()

  // 定时清理过期缓存
  setInterval(cleanExpiredCache, 5 * 60 * 1000) // 每5分钟清理一次

  return {
    // 状态
    settings,
    cache,
    isLoading,
    networkStatus,
    
    // 计算属性
    isDarkMode,
    isOnline,
    
    // Actions
    setSettings,
    updateSettings,
    updateCache,
    setCacheItem,
    getCacheItem,
    cleanExpiredCache,
    clearCache,
    setLoading,
    setNetworkStatus,
    toggleTheme,
    updateThemeClass,
    setLanguage,
    restoreSettings,
    resetSettings,
    getAppInfo,
    initNetworkMonitoring
  }
})
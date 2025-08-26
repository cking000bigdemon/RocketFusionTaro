/**
 * 用户状态管理
 * 配合RouterHandler的ProcessData指令使用
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref(null)
  const userList = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // 计算属性
  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.is_admin || false)
  const username = computed(() => user.value?.username || '')

  // Actions - 这些方法会被RouterHandler的ProcessData指令调用

  /**
   * 设置用户信息
   * @param {Object} userData - 用户数据
   */
  function setUser(userData) {
    user.value = userData
    
    // 持久化存储
    if (userData) {
      localStorage.setItem('user_info', JSON.stringify(userData))
    } else {
      localStorage.removeItem('user_info')
    }
  }

  /**
   * 更新用户信息（合并）
   * @param {Object} userData - 部分用户数据
   */
  function updateUser(userData) {
    if (user.value) {
      user.value = { ...user.value, ...userData }
      localStorage.setItem('user_info', JSON.stringify(user.value))
    }
  }

  /**
   * 清除用户信息
   */
  function clearUser() {
    user.value = null
    localStorage.removeItem('user_info')
    localStorage.removeItem('auth_token')
  }

  /**
   * 设置用户列表
   * @param {Array} list - 用户列表
   */
  function setUserList(list) {
    userList.value = list || []
  }

  /**
   * 添加用户到列表
   * @param {Object} userData - 用户数据
   */
  function addUserToList(userData) {
    if (userData) {
      userList.value.push(userData)
    }
  }

  /**
   * 从列表中移除用户
   * @param {string} userId - 用户ID
   */
  function removeUserFromList(userId) {
    const index = userList.value.findIndex(u => u.id === userId)
    if (index !== -1) {
      userList.value.splice(index, 1)
    }
  }

  /**
   * 更新列表中的用户
   * @param {string} userId - 用户ID
   * @param {Object} userData - 用户数据
   */
  function updateUserInList(userId, userData) {
    const index = userList.value.findIndex(u => u.id === userId)
    if (index !== -1) {
      userList.value[index] = { ...userList.value[index], ...userData }
    }
  }

  /**
   * 设置加载状态
   * @param {boolean} loading - 是否加载中
   */
  function setLoading(loading) {
    isLoading.value = loading
  }

  /**
   * 设置错误信息
   * @param {string|null} errorMessage - 错误信息
   */
  function setError(errorMessage) {
    error.value = errorMessage
  }

  /**
   * 清除错误信息
   */
  function clearError() {
    error.value = null
  }

  /**
   * 从本地存储恢复用户信息
   */
  function restoreFromStorage() {
    try {
      const storedUser = localStorage.getItem('user_info')
      if (storedUser) {
        user.value = JSON.parse(storedUser)
      }
    } catch (error) {
      console.error('Failed to restore user from storage:', error)
      localStorage.removeItem('user_info')
    }
  }

  /**
   * 获取用户权限列表
   * @returns {Array}
   */
  function getUserPermissions() {
    if (!user.value) return []
    
    // 基础权限
    const permissions = ['read']
    
    if (user.value.is_admin) {
      permissions.push('admin', 'write', 'delete')
    } else {
      permissions.push('write')
    }
    
    return permissions
  }

  /**
   * 检查用户是否有特定权限
   * @param {string} permission - 权限名称
   * @returns {boolean}
   */
  function hasPermission(permission) {
    const permissions = getUserPermissions()
    return permissions.includes(permission)
  }

  /**
   * 获取用户显示名称
   * @returns {string}
   */
  function getDisplayName() {
    if (!user.value) return '游客'
    return user.value.display_name || user.value.username || '未知用户'
  }

  // 初始化时恢复状态
  restoreFromStorage()

  return {
    // 状态
    user,
    userList,
    isLoading,
    error,
    
    // 计算属性
    isLoggedIn,
    isAdmin,
    username,
    
    // Actions
    setUser,
    updateUser,
    clearUser,
    setUserList,
    addUserToList,
    removeUserFromList,
    updateUserInList,
    setLoading,
    setError,
    clearError,
    restoreFromStorage,
    getUserPermissions,
    hasPermission,
    getDisplayName
  }
})
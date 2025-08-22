import { create } from 'zustand'
import Taro from '@tarojs/taro'

// API基础地址配置
const getBaseURL = () => {
  // 小程序开发时直接使用本地地址
  return 'http://localhost:8000'
}

// 统一的网络请求方法
const request = async (url, options = {}) => {
  const baseURL = getBaseURL()
  const fullURL = `${baseURL}${url}`
  
  // 获取存储的session token
  const sessionToken = Taro.getStorageSync('session_token')
  
  const requestConfig = {
    url: fullURL,
    method: options.method || 'GET',
    data: options.data,
    header: {
      'Content-Type': 'application/json',
      // 如果有session token，添加到请求头
      ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
      ...options.header
    },
    ...options
  }
  
  // 详细的请求日志
  console.log('🚀 发起网络请求:', {
    url: fullURL,
    method: requestConfig.method,
    data: requestConfig.data,
    headers: requestConfig.header
  })
  
  // 弹窗显示请求信息用于调试
  Taro.showModal({
    title: '网络请求调试',
    content: `URL: ${fullURL}\n方法: ${requestConfig.method}`,
    showCancel: false
  })
  
  try {
    const response = await Taro.request(requestConfig)
    
    // 详细的响应日志
    console.log('📨 网络响应:', {
      url: fullURL,
      statusCode: response.statusCode,
      data: response.data,
      header: response.header
    })
    
    if (response.statusCode === 200) {
      return response.data
    } else {
      // 创建包含详细信息的错误
      const errorMessage = `请求失败 - 状态码: ${response.statusCode}, URL: ${fullURL}`
      console.error('❌ HTTP错误:', {
        statusCode: response.statusCode,
        url: fullURL,
        response: response.data
      })
      throw new Error(errorMessage)
    }
  } catch (error) {
    // 区分网络错误和HTTP错误
    if (error.errMsg) {
      // 这是Taro.request的网络错误
      console.error('❌ 网络连接错误:', {
        url: fullURL,
        errMsg: error.errMsg,
        errno: error.errno
      })
      
      // 弹窗显示网络错误
      Taro.showModal({
        title: '网络错误调试',
        content: `URL: ${fullURL}\n错误: ${error.errMsg}`,
        showCancel: false
      })
      
      throw new Error(`网络连接失败: ${error.errMsg}`)
    } else {
      // 这是我们抛出的HTTP状态码错误
      console.error('❌ 请求处理错误:', error)
      throw error
    }
  }
}

export const useStore = create((set, get) => ({
  user: null,
  loading: false,
  userList: [],
  
  // 获取单个用户信息
  fetchUser: async () => {
    set({ loading: true })
    try {
      const data = await request('/api/user')
      set({ user: data.data, loading: false })
    } catch (error) {
      console.error('Failed to fetch user:', error)
      set({ loading: false })
      Taro.showToast({
        title: '获取用户信息失败',
        icon: 'error'
      })
    }
  },
  
  // 获取用户数据列表
  fetchUserData: async () => {
    set({ loading: true })
    try {
      const data = await request('/api/user-data')
      set({ userList: data.data || [], loading: false })
    } catch (error) {
      console.error('Failed to fetch user data:', error)
      set({ loading: false })
      Taro.showToast({
        title: '获取数据失败',
        icon: 'error'
      })
    }
  },
  
  // 创建用户数据
  createUserData: async (userData) => {
    set({ loading: true })
    try {
      const data = await request('/api/user-data', {
        method: 'POST',
        data: userData
      })
      
      if (data.code === 200) {
        // 刷新用户数据列表
        get().fetchUserData()
        Taro.showToast({
          title: '创建成功',
          icon: 'success'
        })
        return data.data
      } else {
        throw new Error(data.message || '创建失败')
      }
    } catch (error) {
      console.error('Failed to create user data:', error)
      set({ loading: false })
      Taro.showToast({
        title: error.message || '创建失败',
        icon: 'error'
      })
      throw error
    }
  },
  
  // 用户登录
  login: async (credentials) => {
    console.log('🔐 开始登录流程:', credentials.username)
    set({ loading: true })
    try {
      const data = await request('/api/auth/login', {
        method: 'POST',
        data: credentials
      })
      
      console.log('🔐 登录响应数据:', data)
      
      if (data && data.code === 200) {
        // 保存session token到本地存储
        if (data.data && data.data.session_token) {
          console.log('💾 保存session token')
          Taro.setStorageSync('session_token', data.data.session_token)
        }
        set({ user: data.data.user, loading: false })
        Taro.showToast({
          title: '登录成功',
          icon: 'success'
        })
        console.log('✅ 登录成功')
        return data.data
      } else {
        const errorMsg = (data && data.message) || '登录失败：服务器返回异常数据'
        console.error('❌ 登录失败 - 响应数据异常:', data)
        throw new Error(errorMsg)
      }
    } catch (error) {
      console.error('❌ 登录流程失败:', {
        error: error.message,
        stack: error.stack
      })
      set({ loading: false })
      
      // 显示更详细的错误信息
      let errorMessage = '登录失败'
      if (error.message.includes('网络连接失败')) {
        errorMessage = '网络连接失败，请检查网络设置'
      } else if (error.message.includes('状态码')) {
        errorMessage = '服务器连接异常'
      } else {
        errorMessage = error.message || '未知错误'
      }
      
      Taro.showToast({
        title: errorMessage,
        icon: 'error',
        duration: 3000
      })
      throw error
    }
  },
  
  // 获取当前用户信息
  getCurrentUser: async () => {
    set({ loading: true })
    try {
      const data = await request('/api/auth/current')
      
      if (data.code === 200) {
        set({ user: data.data, loading: false })
        return data.data
      } else {
        throw new Error(data.message || '获取用户信息失败')
      }
    } catch (error) {
      console.error('Failed to get current user:', error)
      set({ loading: false })
      // 如果是401错误，清除用户信息和session token
      if (error.message.includes('401')) {
        set({ user: null })
        Taro.removeStorageSync('session_token')
      }
      Taro.showToast({
        title: error.message || '获取用户信息失败',
        icon: 'error'
      })
      throw error
    }
  },
  
  // 用户登出
  logout: async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' })
      set({ user: null })
      Taro.removeStorageSync('session_token')
      Taro.showToast({
        title: '已退出登录',
        icon: 'success'
      })
    } catch (error) {
      console.error('Logout failed:', error)
      // 即使请求失败也清除本地用户信息和session token
      set({ user: null })
      Taro.removeStorageSync('session_token')
    }
  },
  
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  setUserList: (userList) => set({ userList })
}))
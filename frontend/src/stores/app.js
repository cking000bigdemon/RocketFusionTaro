import { create } from 'zustand'
import Taro from '@tarojs/taro'
import RouterHandler from '../utils/routerHandler'

// API基础地址配置
const getBaseURL = () => {
  // 小程序开发时直接使用本地地址
  return 'http://localhost:8000'
}

// 全局路由指令拦截器 - 统一的网络请求方法
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
  
  // 开发环境日志
  if (process.env.NODE_ENV === 'development') {
    console.group(`📡 API Request: ${requestConfig.method} ${fullURL}`)
    console.log('Request Config:', requestConfig)
    console.time('Request Duration')
  }
  
  try {
    const response = await Taro.request(requestConfig)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Raw Response:', response)
      console.timeEnd('Request Duration')
      console.groupEnd()
    }
    
    if (response.statusCode === 200) {
      const responseData = response.data
      
      // 🚀 全局路由指令拦截器核心逻辑
      if (responseData && typeof responseData === 'object') {
        // 检查响应中是否包含路由指令
        const routeCommand = responseData.route_command || responseData.routeCommand
        
        if (routeCommand) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🎯 Route command detected in response:', routeCommand)
          }
          
          // 异步执行路由指令，不阻塞当前请求的返回
          setTimeout(async () => {
            try {
              // 获取当前的路由处理器实例
              const store = useStore.getState()
              const routerHandler = store.getRouterHandler()
              
              if (routerHandler) {
                await routerHandler.execute(routeCommand)
              } else {
                console.warn('RouterHandler not available, cannot execute route command')
              }
            } catch (routeError) {
              console.error('Failed to execute route command:', routeError)
              // 显示通用错误提示
              Taro.showToast({
                title: '操作失败',
                icon: 'error',
                duration: 2000
              })
            }
          }, 0)
        }
      }
      
      return responseData
    } else {
      // HTTP错误处理
      const errorMessage = `请求失败 - 状态码: ${response.statusCode}, URL: ${fullURL}`
      console.error('HTTP Error:', response.statusCode, fullURL, response.data)
      
      // 检查错误响应中是否有路由指令
      if (response.data && response.data.route_command) {
        setTimeout(async () => {
          try {
            const store = useStore.getState()
            const routerHandler = store.getRouterHandler()
            if (routerHandler) {
              await routerHandler.execute(response.data.route_command)
            }
          } catch (routeError) {
            console.error('Failed to execute error route command:', routeError)
          }
        }, 0)
      }
      
      throw new Error(errorMessage)
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Request failed:', error)
      console.timeEnd('Request Duration')
      console.groupEnd()
    }
    
    // 区分网络错误和HTTP错误
    if (error.errMsg) {
      // 这是Taro.request的网络错误
      console.error('Network Error:', error.errMsg)
      throw new Error(`网络连接失败: ${error.errMsg}`)
    } else {
      // 这是我们抛出的HTTP状态码错误或其他错误
      throw error
    }
  }
}

export const useStore = create((set, get) => {
  // 创建路由处理器实例
  let routerHandler = null

  const store = {
    user: null,
    loading: false,
    userList: [],
    
    // 初始化路由处理器
    initRouterHandler() {
      if (!routerHandler) {
        routerHandler = new RouterHandler({
          setUser: (user) => set({ user }),
          updateUser: (userData) => set(state => ({ 
            user: state.user ? { ...state.user, ...userData } : userData 
          })),
          clearUser: () => set({ user: null }),
          setUserList: (userList) => set({ userList }),
          // 添加其他可能需要的数据更新方法
          updateSettings: (settings) => set(state => ({
            settings: { ...state.settings, ...settings }
          })),
          setSettings: (settings) => set({ settings }),
          updateCache: (cacheData) => set(state => ({
            cache: { ...state.cache, ...cacheData }
          })),
          // 提供完整的store访问
          user: get().user,
        })
        
        // 更新路由处理器的store引用
        routerHandler.updateStore(get())
      }
      return routerHandler
    },

    // 执行路由指令的统一方法（已被全局拦截器取代，保留兼容性）
    async executeRouteCommand(routeCommand) {
      const handler = get().initRouterHandler()
      if (routeCommand) {
        await handler.execute(routeCommand)
      }
    },
    
    // 用户登录 - 使用全局拦截器的简化版本
    login: async (credentials) => {
      set({ loading: true })
      
      try {
        const data = await request('/api/auth/login', {
          method: 'POST',
          data: credentials
        })
        
        if (data && data.code === 200) {
          // 处理会话数据（向后兼容）
          if (data.data && data.data.session_token) {
            Taro.setStorageSync('session_token', data.data.session_token)
          }
          
          // 注意：路由指令现在由全局拦截器自动处理
          // 这里只处理纯数据响应（没有路由指令的情况）
          if (!data.route_command) {
            // 传统方式处理：直接设置用户数据
            if (data.data && data.data.user) {
              set({ user: data.data.user })
            }
            Taro.showToast({
              title: '登录成功',
              icon: 'success'
            })
          }
          
          set({ loading: false })
          return data
        } else {
          const errorMsg = (data && data.message) || '登录失败：服务器返回异常数据'
          console.error('Login failed - Invalid response:', data)
          throw new Error(errorMsg)
        }
      } catch (error) {
        console.error('Login failed:', error.message)
        set({ loading: false })
        
        // 显示错误信息（仅当全局拦截器没有处理时）
        if (!error.handled) {
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
        }
        throw error
      }
    },

    // 用户登出 - 使用全局拦截器的简化版本
    logout: async () => {
      try {
        const data = await request('/api/auth/logout', { method: 'POST' })
        
        // 注意：路由指令现在由全局拦截器自动处理
        // 这里只处理没有路由指令的情况
        if (!data.route_command) {
          set({ user: null })
          Taro.removeStorageSync('session_token')
          Taro.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      } catch (error) {
        console.error('Logout failed:', error)
        // 即使请求失败也清除本地用户信息和session token
        set({ user: null })
        Taro.removeStorageSync('session_token')
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

    // 数据管理方法
    setUser: (user) => {
      set({ user })
      // 更新路由处理器的store引用
      if (routerHandler) {
        routerHandler.updateStore(get())
      }
    },
    clearUser: () => {
      set({ user: null })
      if (routerHandler) {
        routerHandler.updateStore(get())
      }
    },
    setUserList: (userList) => set({ userList }),
    
    // 获取路由处理器实例（用于外部访问）
    getRouterHandler: () => {
      return get().initRouterHandler()
    }
  }

  return store
})

// 导出request函数供外部使用
export { request }
/**
 * 微信小程序应用入口
 * 使用原生开发 + Skyline渲染，集成后端驱动路由系统
 */

// 导入共享模块（需要通过构建工具处理）
const RouterHandlerCore = require('./utils/RouterHandlerCore.js')
const WeChatPlatformAdapter = require('./utils/WeChatPlatformAdapter.js')
const ApiClient = require('./utils/ApiClient.js')
const config = require('./utils/config.js')

App({
  /**
   * 应用全局数据
   */
  globalData: {
    userInfo: null,
    systemInfo: null,
    routerHandler: null,
    apiClient: null,
    config: config,
    settings: {
      theme: 'light',
      language: 'zh-CN',
      notifications: true,
      autoLogin: false
    },
    protectedPages: [
      '/pages/home/home',
      '/pages/profile/profile',
      '/pages/user-data/user-data'
    ],
    redirectPath: null
  },

  SESSION_EXPIRE_DAYS: 7,

  /**
   * 应用启动
   */
  onLaunch(options) {
    console.log('🚀 Rocket Mini Program launched with options:', options)
    
    // 初始化系统信息
    this.initSystemInfo()
    
    // 初始化RouterHandler
    this.initRouterHandler()
    
    // 初始化API客户端
    this.initApiClient()
    
    // 检查更新
    this.checkForUpdate()
    
    // 处理启动场景
    this.handleLaunchScene(options)
    
    // 检查并恢复用户登录状态
    this.checkLoginStatus()
  },

  /**
   * 应用显示
   */
  onShow(options) {
    console.log('App onShow:', options)
    
    // 更新场景值
    this.globalData.scene = options.scene
    
    // 处理从后台恢复的逻辑
    this.handleAppResume()
  },

  /**
   * 应用隐藏
   */
  onHide() {
    console.log('App onHide')
    
    // 保存应用状态
    this.saveAppState()
  },

  /**
   * 应用错误
   */
  onError(error) {
    console.error('App Error:', error)
    
    // 上报错误
    this.reportError({
      type: 'app_error',
      message: error,
      timestamp: new Date().toISOString()
    })
  },

  /**
   * 页面不存在
   */
  onPageNotFound(res) {
    console.log('Page not found:', res)
    
    // 重定向到首页或404页面
    wx.reLaunch({
      url: '/pages/home/home'
    })
  },

  /**
   * 初始化系统信息
   */
  initSystemInfo() {
    try {
      const systemInfo = wx.getSystemInfoSync()
      this.globalData.systemInfo = systemInfo
      
      console.log('System Info:', systemInfo)
      
      // 设置状态栏样式
      if (systemInfo.platform === 'ios') {
        wx.setNavigationBarColor({
          frontColor: '#ffffff',
          backgroundColor: '#4A90E2'
        })
      }
    } catch (error) {
      console.error('Failed to get system info:', error)
    }
  },

  /**
   * 初始化RouterHandler
   */
  initRouterHandler() {
    try {
      const platformAdapter = new WeChatPlatformAdapter()
      const routerHandler = new RouterHandlerCore(this.globalData, platformAdapter)
      
      // 设置调试模式
      if (wx.getAccountInfoSync().miniProgram.envVersion !== 'release') {
        routerHandler.setDebugMode(true)
      }
      
      this.globalData.routerHandler = routerHandler
      
      console.log('RouterHandler initialized')
    } catch (error) {
      console.error('Failed to initialize RouterHandler:', error)
    }
  },

  /**
   * 初始化API客户端
   */
  initApiClient() {
    try {
      const apiClient = new ApiClient(this.globalData.routerHandler)
      
      // 设置基础URL - 小程序环境下使用局域网IP进行真机调试
      const accountInfo = wx.getAccountInfoSync()
      if (accountInfo.miniProgram.envVersion === 'develop' || accountInfo.miniProgram.envVersion === 'trial') {
        apiClient.setBaseURL(config.api.development)
        console.log('API Client using development URL:', config.api.development)
      } else {
        apiClient.setBaseURL(config.api.production)
        console.log('API Client using production URL:', config.api.production)
      }
      
      this.globalData.apiClient = apiClient
      
      console.log('API Client initialized successfully')
    } catch (error) {
      console.error('Failed to initialize API Client:', error)
      // 设置一个简单的fallback
      this.globalData.apiClient = null
    }
  },

  /**
   * 检查小程序更新
   */
  checkForUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          console.log('Found new version')
        }
      })

      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate()
            }
          }
        })
      })

      updateManager.onUpdateFailed(() => {
        wx.showModal({
          title: '更新失败',
          content: '新版本下载失败，请检查网络后重试',
          showCancel: false
        })
      })
    }
  },

  /**
   * 处理启动场景
   */
  handleLaunchScene(options) {
    const scene = options.scene
    console.log('Launch scene:', scene)
    
    // 根据不同场景值处理逻辑
    switch (scene) {
      case 1001: // 发现栏小程序主入口
      case 1089: // 微信聊天主界面下拉，「最近使用」栏
        // 正常启动
        break
      case 1007: // 单人聊天会话中的小程序消息卡片
      case 1008: // 群聊会话中的小程序消息卡片
        // 从分享卡片启动
        this.handleShareCardLaunch(options)
        break
      case 1011: // 扫描二维码
        this.handleQRCodeScan(options)
        break
      default:
        console.log('Other launch scene:', scene)
    }
  },

  /**
   * 处理分享卡片启动
   */
  handleShareCardLaunch(options) {
    // 可以根据分享参数跳转到特定页面
    console.log('Launched from share card:', options)
  },

  /**
   * 处理二维码扫描启动
   */
  handleQRCodeScan(options) {
    const query = options.query
    console.log('QR code scan query:', query)
    
    // 解析二维码参数并处理
    if (query.action) {
      this.handleDeepLink(query)
    }
  },

  /**
   * 处理深度链接
   */
  handleDeepLink(query) {
    console.log('Handle deep link:', query)
    
    // 根据action参数执行相应操作
    switch (query.action) {
      case 'login':
        wx.navigateTo({ url: '/pages/login/login' })
        break
      case 'profile':
        wx.navigateTo({ url: '/pages/profile/profile' })
        break
      default:
        console.log('Unknown deep link action:', query.action)
    }
  },

  /**
   * 处理应用从后台恢复
   */
  async handleAppResume() {
    if (this.isLoggedIn()) {
      const isValid = await this.validateUserSession()
      if (!isValid) {
        wx.reLaunch({
          url: '/pages/login/login'
        })
      }
    }
    
    this.syncServerTime()
  },

  /**
   * 验证用户会话
   */
  async validateUserSession() {
    if (!this.isLoggedIn() || !this.isSessionValid()) {
      this.clearUserSession()
      return false
    }
    
    try {
      const response = await this.globalData.apiClient.mobileGetUserInfo()
      if (response.code === 200) {
        this.globalData.userInfo = response.data
        return true
      } else {
        this.clearUserSession()
        return false
      }
    } catch (error) {
      console.error('Failed to validate session:', error)
      this.clearUserSession()
      return false
    }
  },

  /**
   * 检查登录状态和7天免登录
   */
  checkLoginStatus() {
    try {
      const token = wx.getStorageSync('token')
      const userInfo = wx.getStorageSync('user_info')
      const loginTime = wx.getStorageSync('login_time')
      
      if (!token || !userInfo || !loginTime) {
        console.log('No valid session found')
        this.handleNoValidSession()
        return
      }
      
      const now = Date.now()
      const expireTime = this.SESSION_EXPIRE_DAYS * 24 * 60 * 60 * 1000
      const isExpired = (now - loginTime) > expireTime
      
      if (isExpired) {
        console.log('Session expired, clearing data')
        this.clearUserSession()
        this.handleNoValidSession()
        return
      }
      
      console.log('Valid session found, auto login')
      this.restoreUserSession(token, userInfo)
      
    } catch (error) {
      console.error('Failed to check login status:', error)
      this.handleNoValidSession()
    }
  },

  /**
   * 恢复用户会话
   */
  restoreUserSession(token, userInfo) {
    this.globalData.userInfo = userInfo
    if (this.globalData.apiClient) {
      this.globalData.apiClient.setMobileAuth(token)
    }
    console.log('User session restored for 7-day auto login')
  },

  /**
   * 处理无有效会话的情况
   */
  handleNoValidSession() {
    wx.reLaunch({
      url: '/pages/login/login'
    })
  },

  /**
   * 清除用户会话
   */
  clearUserSession() {
    this.globalData.userInfo = null
    
    try {
      wx.removeStorageSync('token')
      wx.removeStorageSync('user_info')
      wx.removeStorageSync('login_time')
      wx.removeStorageSync('expires_in')
      wx.removeStorageSync('userInfo')
      wx.removeStorageSync('authToken')
      
      if (this.globalData.apiClient) {
        this.globalData.apiClient.clearAuth()
      }
    } catch (error) {
      console.error('Failed to clear user session:', error)
    }
  },

  /**
   * 保存用户会话（7天免登录）
   */
  setUserSession(userInfo, token) {
    const loginTime = Date.now()
    const expiresIn = this.SESSION_EXPIRE_DAYS * 24 * 60 * 60 * 1000
    
    this.globalData.userInfo = userInfo
    
    try {
      wx.setStorageSync('token', token)
      wx.setStorageSync('user_info', userInfo)
      wx.setStorageSync('login_time', loginTime)
      wx.setStorageSync('expires_in', expiresIn)
      
      if (this.globalData.apiClient) {
        this.globalData.apiClient.setMobileAuth(token)
      }
      
      console.log('User session saved with 7-day expiry')
    } catch (error) {
      console.error('Failed to save user session:', error)
    }
  },

  /**
   * 保存用户信息
   */
  saveUserInfo(userInfo) {
    this.globalData.userInfo = userInfo
    
    try {
      wx.setStorageSync('userInfo', userInfo)
    } catch (error) {
      console.error('Failed to save user info:', error)
    }
  },

  /**
   * 保存应用状态
   */
  saveAppState() {
    try {
      const appState = {
        settings: this.globalData.settings,
        timestamp: Date.now()
      }
      
      wx.setStorageSync('appState', appState)
    } catch (error) {
      console.error('Failed to save app state:', error)
    }
  },

  /**
   * 同步服务器时间
   */
  async syncServerTime() {
    try {
      if (!this.globalData.apiClient) {
        console.warn('API client not available for time sync')
        return
      }
      
      const response = await this.globalData.apiClient.getSystemConfig()
      if (response.data && response.data.server_time) {
        this.globalData.serverTime = response.data.server_time
        this.globalData.timeOffset = Date.now() - new Date(response.data.server_time).getTime()
      }
    } catch (error) {
      console.warn('Failed to sync server time (endpoint may not exist):', error)
    }
  },

  /**
   * 获取服务器时间
   */
  getServerTime() {
    if (this.globalData.timeOffset) {
      return new Date(Date.now() - this.globalData.timeOffset)
    }
    return new Date()
  },

  /**
   * 上报错误
   */
  async reportError(errorInfo) {
    try {
      const reportData = {
        ...errorInfo,
        platform: 'miniprogram',
        version: wx.getAccountInfoSync().miniProgram.version,
        systemInfo: this.globalData.systemInfo,
        userInfo: this.globalData.userInfo ? {
          id: this.globalData.userInfo.id,
          username: this.globalData.userInfo.username
        } : null
      }
      
      await this.globalData.apiClient.reportError(reportData)
    } catch (error) {
      console.error('Failed to report error:', error)
    }
  },

  /**
   * 获取用户信息
   */
  getUserInfo() {
    return this.globalData.userInfo
  },

  /**
   * 检查用户是否已登录
   */
  isLoggedIn() {
    return !!this.globalData.userInfo
  },

  /**
   * 检查用户是否已登录（兼容旧方法名）
   */
  isUserLoggedIn() {
    return this.isLoggedIn()
  },

  /**
   * 检查会话是否有效（未过期）
   */
  isSessionValid() {
    try {
      const loginTime = wx.getStorageSync('login_time')
      if (!loginTime) return false
      
      const now = Date.now()
      const expireTime = this.SESSION_EXPIRE_DAYS * 24 * 60 * 60 * 1000
      return (now - loginTime) <= expireTime
    } catch (error) {
      console.error('Failed to check session validity:', error)
      return false
    }
  },

  /**
   * 获取RouterHandler实例
   */
  getRouterHandler() {
    return this.globalData.routerHandler
  },

  /**
   * 获取API客户端实例
   */
  getApiClient() {
    return this.globalData.apiClient
  },

  /**
   * 检查页面是否需要登录访问
   */
  isProtectedPage(url) {
    if (!url) return false
    
    const normalizedUrl = url.split('?')[0]
    return this.globalData.protectedPages.includes(normalizedUrl)
  },

  /**
   * 检查页面访问权限
   */
  checkPageAccess(url, saveRedirect = true) {
    if (!this.isProtectedPage(url)) {
      return true
    }

    const isLoggedIn = this.isLoggedIn()
    const isSessionValid = this.isSessionValid()

    if (isLoggedIn && isSessionValid) {
      return true
    }

    if (saveRedirect) {
      this.globalData.redirectPath = url
      console.log('Saving redirect path:', url)
    }

    return false
  },

  /**
   * 处理受保护页面访问
   */
  async handleProtectedPageAccess(url) {
    if (this.checkPageAccess(url, true)) {
      return true
    }

    // 防止循环请求：如果当前已经在登录页面，不再处理
    const currentPages = getCurrentPages()
    if (currentPages && currentPages.length > 0) {
      const currentRoute = currentPages[currentPages.length - 1].route
      if (currentRoute === 'pages/login/login') {
        console.log('Already on login page, skipping protected page access handling')
        return false
      }
    }

    try {
      const response = await this.globalData.apiClient.authStatus({ 
        current_path: url 
      })
      
      if (response.route_command) {
        // 检查路由指令，避免循环导航
        const command = response.route_command
        if (command.type === 'NavigateTo' && command.payload && command.payload.path) {
          const targetPath = command.payload.path.split('?')[0]
          const currentPath = url.split('?')[0]
          
          if (targetPath === currentPath) {
            console.warn('Preventing navigation loop in handleProtectedPageAccess')
            return false
          }
        }
        
        await this.globalData.routerHandler.execute(response.route_command)
      } else {
        // 使用reLaunch确保清空页面栈
        wx.reLaunch({
          url: '/pages/login/login'
        })
      }
    } catch (error) {
      console.error('Failed to handle protected page access:', error)
      // 只有在不是登录页面时才跳转到登录页
      const currentPages = getCurrentPages()
      if (currentPages && currentPages.length > 0) {
        const currentRoute = currentPages[currentPages.length - 1].route
        if (currentRoute !== 'pages/login/login') {
          wx.reLaunch({
            url: '/pages/login/login'
          })
        }
      }
    }

    return false
  },

  /**
   * 获取并清除重定向路径
   */
  getAndClearRedirectPath() {
    const path = this.globalData.redirectPath
    this.globalData.redirectPath = null
    return path
  },

  /**
   * 设置重定向路径
   */
  setRedirectPath(path) {
    this.globalData.redirectPath = path
  }
})
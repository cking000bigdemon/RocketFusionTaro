/**
 * 登录页面逻辑
 * 严格使用后端驱动路由架构
 */

const app = getApp()

Page({
  /**
   * 页面数据
   */
  data: {
    form: {
      username: '',
      password: '',
      rememberMe: false
    },
    isLoading: false,
    showWxLogin: true,
    appVersion: '1.0.0',
    platformInfo: ''
  },

  /**
   * 页面加载完成
   */
  onLoad(options) {
    console.log('Login page loaded with options:', options)
    
    // 设置平台信息
    this.setPlatformInfo()
    
    // 恢复保存的用户名
    this.restoreSavedCredentials()
    
    // 检查是否已登录
    this.checkLoginStatus()
    
    // 处理重定向参数
    if (options.redirect) {
      this.redirectPath = decodeURIComponent(options.redirect)
      console.log('Will redirect to:', this.redirectPath, 'after login')
    } else {
      // 检查app中保存的重定向路径
      this.redirectPath = app.getAndClearRedirectPath()
      if (this.redirectPath) {
        console.log('Found saved redirect path:', this.redirectPath)
      }
    }
  },

  /**
   * 页面显示
   */
  onShow() {
    // 清除加载状态（防止从其他页面返回时状态异常）
    if (this.data.isLoading) {
      this.setData({ isLoading: false })
    }
  },

  /**
   * 设置平台信息
   */
  setPlatformInfo() {
    const systemInfo = wx.getSystemInfoSync()
    const accountInfo = wx.getAccountInfoSync()
    
    this.setData({
      appVersion: accountInfo.miniProgram.version || '1.0.0',
      platformInfo: `${systemInfo.model} ${systemInfo.system}`
    })
  },

  /**
   * 恢复保存的凭据
   */
  restoreSavedCredentials() {
    try {
      const savedUsername = wx.getStorageSync('savedUsername')
      const rememberMe = wx.getStorageSync('rememberMe')
      
      if (savedUsername && rememberMe) {
        this.setData({
          'form.username': savedUsername,
          'form.rememberMe': true
        })
      }
    } catch (error) {
      console.error('Failed to restore credentials:', error)
    }
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const isLoggedIn = app.isLoggedIn()
    const isSessionValid = app.isSessionValid()
    
    if (isLoggedIn && isSessionValid) {
      console.log('User already logged in with valid session, redirecting...')
      
      if (this.redirectPath) {
        this.navigateToPage(this.redirectPath)
      } else {
        this.navigateToPage('/pages/home/home')
      }
    } else if (isLoggedIn && !isSessionValid) {
      console.log('Session expired, clearing and staying on login page')
      app.clearUserSession()
    }
  },

  /**
   * 用户名输入处理
   */
  onUsernameInput(e) {
    this.setData({
      'form.username': e.detail.value
    })
  },

  /**
   * 密码输入处理
   */
  onPasswordInput(e) {
    this.setData({
      'form.password': e.detail.value
    })
  },

  /**
   * 记住密码选项变化
   */
  onRememberChange(e) {
    const remember = e.detail.value.includes('remember')
    this.setData({
      'form.rememberMe': remember
    })
    
    // 保存或清除记住密码选项
    try {
      if (remember && this.data.form.username) {
        wx.setStorageSync('savedUsername', this.data.form.username)
        wx.setStorageSync('rememberMe', true)
      } else {
        wx.removeStorageSync('savedUsername')
        wx.removeStorageSync('rememberMe')
      }
    } catch (error) {
      console.error('Failed to save remember option:', error)
    }
  },

  /**
   * 处理登录表单提交
   */
  async handleLogin() {
    const { username, password } = this.data.form
    
    // 表单验证
    if (!username.trim()) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'error'
      })
      return
    }
    
    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'error'
      })
      return
    }

    this.setData({ isLoading: true })

    try {
      const apiClient = app.getApiClient()
      const routerHandler = app.getRouterHandler()
      
      // 检查API客户端是否初始化成功
      if (!apiClient) {
        throw new Error('API客户端未初始化，请重启小程序')
      }
      
      // 调用登录API - 这里会自动处理路由指令
      const response = await apiClient.mobileLogin({
        username: username.trim(),
        password: password,
        remember_me: this.data.form.rememberMe
      })

      console.log('Login API called successfully:', response)

      // 保存用户会话（7天免登录）
      if (response.data) {
        const { session_token, user } = response.data
        if (session_token && user) {
          app.setUserSession(user, session_token)
        }
        
        // 兼容旧版本保存方式
        if (session_token) {
          try {
            wx.setStorageSync('authToken', session_token)
            apiClient.setMobileAuth(session_token)
          } catch (error) {
            console.error('Failed to save auth token:', error)
          }
        }
      }

      // 保存用户名（如果选择了记住密码）
      if (this.data.form.rememberMe) {
        try {
          wx.setStorageSync('savedUsername', username.trim())
          wx.setStorageSync('rememberMe', true)
        } catch (error) {
          console.error('Failed to save username:', error)
        }
      }

      // 处理登录后跳转
      this.handlePostLoginRedirect(response)

    } catch (error) {
      console.error('Login failed:', error)
      
      // 显示错误信息（如果后端没有通过路由指令处理）
      let errorMessage = '登录失败，请重试'
      
      if (error.message.includes('HTTP 401')) {
        errorMessage = '用户名或密码错误'
      } else if (error.message.includes('Network error')) {
        errorMessage = '网络连接失败，请检查网络'
      } else if (error.message.includes('timeout')) {
        errorMessage = '请求超时，请重试'
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'error',
        duration: 3000
      })
      
    } finally {
      this.setData({ isLoading: false })
    }
  },

  /**
   * 快速登录
   */
  async quickLogin(e) {
    const type = e.currentTarget.dataset.type
    
    const credentials = {
      admin: { username: 'admin', password: 'password' },
      test: { username: 'test', password: 'password' }
    }

    const credential = credentials[type]
    if (!credential) {
      console.error('Unknown quick login type:', type)
      return
    }

    // 填入表单数据
    this.setData({
      'form.username': credential.username,
      'form.password': credential.password,
      'form.rememberMe': false
    })
    
    // 延迟一下让用户看到表单变化
    setTimeout(() => {
      this.handleLogin()
    }, 300)
  },

  /**
   * 微信授权登录
   */
  async handleWxLogin(e) {
    if (!e.detail.userInfo) {
      wx.showToast({
        title: '需要授权才能登录',
        icon: 'none'
      })
      return
    }

    this.setData({ isLoading: true })

    try {
      // 获取微信登录凭证
      const loginRes = await this.wxLogin()
      const code = loginRes.code

      if (!code) {
        throw new Error('Failed to get wx login code')
      }

      const apiClient = app.getApiClient()
      
      // 检查API客户端是否初始化成功
      if (!apiClient) {
        throw new Error('API客户端未初始化，请重启小程序')
      }
      
      // 调用微信登录API
      const response = await apiClient.wxLogin(code, e.detail.userInfo)
      
      console.log('WeChat login successful:', response)

      // 保存微信登录会话（7天免登录）
      if (response.data) {
        const { session_token, user } = response.data
        if (session_token && user) {
          app.setUserSession(user, session_token)
        }
        
        // 兼容旧版本保存方式
        if (session_token) {
          try {
            wx.setStorageSync('authToken', session_token)
            apiClient.setMobileAuth(session_token)
          } catch (error) {
            console.error('Failed to save auth token:', error)
          }
        }
      }

      // 处理登录后跳转
      this.handlePostLoginRedirect(response)

    } catch (error) {
      console.error('WeChat login failed:', error)
      
      wx.showToast({
        title: '微信登录失败',
        icon: 'error'
      })
      
    } finally {
      this.setData({ isLoading: false })
    }
  },

  /**
   * 微信登录Promise封装
   */
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject
      })
    })
  },

  /**
   * 跳转到注册页面
   */
  goToRegister() {
    wx.navigateTo({ 
      url: '/pages/auth/register' 
    })
  },

  /**
   * 处理登录后跳转
   */
  handlePostLoginRedirect(response) {
    // 如果后端返回了路由指令，优先执行路由指令
    if (response.route_command) {
      return
    }

    // 如果有重定向路径，跳转到原始访问页面
    if (this.redirectPath) {
      console.log('Redirecting to saved path:', this.redirectPath)
      this.navigateToPage(this.redirectPath)
      this.redirectPath = null
      return
    }

    // 默认跳转到首页
    this.navigateToPage('/pages/home/home')
  },

  /**
   * 导航到指定页面
   */
  navigateToPage(path) {
    // 判断是否为tabBar页面
    const tabBarPages = [
      '/pages/home/home',
      '/pages/user-data/user-data', 
      '/pages/profile/profile'
    ]

    if (tabBarPages.includes(path)) {
      wx.switchTab({ url: path })
    } else {
      wx.navigateTo({ url: path })
    }
  },

  /**
   * 页面分享配置
   */
  onShareAppMessage() {
    return {
      title: 'Rocket小程序 - 现代化移动端应用',
      path: '/pages/login/login',
      imageUrl: '/images/share-cover.jpg'
    }
  },

  /**
   * 游客登录
   */
  async handleGuestLogin() {
    this.setData({ isLoading: true })

    try {
      const apiClient = app.getApiClient()
      const routerHandler = app.getRouterHandler()
      
      if (!apiClient) {
        throw new Error('API客户端未初始化，请重启小程序')
      }
      
      console.log('Calling guest login API...')
      const response = await apiClient.guestLogin()
      
      console.log('Guest login API called successfully:', response)

      if (response.data) {
        const { session_token, user } = response.data
        if (session_token && user) {
          app.setUserSession(user, session_token)
          console.log('Guest user session saved:', user.username)
        }
        
        if (session_token) {
          try {
            wx.setStorageSync('authToken', session_token)
            apiClient.setMobileAuth(session_token)
          } catch (error) {
            console.error('Failed to save guest auth token:', error)
          }
        }
      }

      this.handlePostLoginRedirect(response)

    } catch (error) {
      console.error('Guest login failed:', error)
      
      let errorMessage = '游客登录失败，请重试'
      
      if (error.message.includes('Network error')) {
        errorMessage = '网络连接失败，请检查网络'
      } else if (error.message.includes('timeout')) {
        errorMessage = '请求超时，请重试'
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'error',
        duration: 3000
      })
      
    } finally {
      this.setData({ isLoading: false })
    }
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: 'Rocket小程序 - 现代化移动端应用',
      imageUrl: '/images/share-timeline.jpg'
    }
  }
})
const app = getApp()

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    menuItems: [
      { id: 'orders', title: '我的订单', icon: '📋' },
      { id: 'favorites', title: '我的收藏', icon: '❤️' },
      { id: 'settings', title: '设置', icon: '⚙️' }
    ]
  },

  onLoad(options) {
    this.loadUserInfo()
  },

  onShow() {
    this.loadUserInfo()
  },

  async loadUserInfo() {
    const userInfo = app.getUserInfo()
    const isLoggedIn = app.isLoggedIn()
    const isSessionValid = app.isSessionValid()
    
    if (!isLoggedIn || !isSessionValid) {
      if (isLoggedIn && !isSessionValid) {
        app.clearUserSession()
        wx.showToast({
          title: '登录已过期',
          icon: 'none'
        })
      }
      
      // 对于TabBar页面的个人中心，直接使用reLaunch跳转，不调用后端路由
      this.handleSessionExpiredForTabBar()
      return
    }

    this.setData({
      userInfo: userInfo,
      isLoggedIn: isLoggedIn
    })
  },

  onMenuItemTap(e) {
    const itemId = e.currentTarget.dataset.id
    
    wx.showToast({
      title: `${itemId} 功能即将上线`,
      icon: 'none',
      duration: 2000
    })
  },

  /**
   * 头像点击事件 - 获取用户授权
   */
  async onAvatarTap() {
    // 先检查会话状态和微信用户身份
    const sessionValid = await this.checkSessionValidity()
    if (!sessionValid) {
      // 如果不是微信用户，显示提示
      wx.showModal({
        title: '提示',
        content: '当前账号不是微信用户，无法获取微信头像和昵称。请使用微信登录后再试。',
        showCancel: false,
        confirmText: '我知道了'
      })
      return
    }

    wx.showModal({
      title: '获取头像和昵称',
      content: '是否允许获取您的微信头像和昵称用于完善个人资料？',
      confirmText: '允许',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.getUserProfile()
        }
      }
    })
  },

  /**
   * 获取用户微信资料
   */
  async getUserProfile() {
    try {
      // 再次检查会话状态
      if (!await this.checkSessionValidity()) {
        return
      }

      wx.showLoading({
        title: '获取中...',
        mask: true
      })

      const profileData = await new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于完善会员资料',
          success: resolve,
          fail: reject
        })
      })

      console.log('获取到的用户资料:', profileData)

      if (profileData.userInfo) {
        await this.updateUserProfile(profileData)
      }

    } catch (error) {
      console.error('getUserProfile failed:', error)
      wx.hideLoading()
      wx.showToast({
        title: '获取失败，请重试',
        icon: 'none'
      })
    }
  },

  /**
   * 更新用户资料到后端
   */
  async updateUserProfile(profileData) {
    try {
      const sessionToken = wx.getStorageSync('authToken')
      if (!sessionToken) {
        console.log('No auth token found for profile update')
        this.handleSessionExpiredForTabBar()
        return
      }
      
      const updateRequest = {
        encrypted_data: profileData.encryptedData,
        iv: profileData.iv,
        signature: profileData.signature,
        raw_data: profileData.rawData
      }

      console.log('发送资料更新请求:', updateRequest)

      // 使用直接的wx.request，避免ApiClient的路由处理
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: 'http://192.168.3.32:8000/api/auth/update-profile',
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          data: updateRequest,
          success: (res) => {
            console.log(`Profile update response: ${res.statusCode}`, res.data)
            if (res.statusCode === 200) {
              resolve(res.data)
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${res.data?.message || 'Update failed'}`))
            }
          },
          fail: (error) => {
            console.error('Profile update request failed:', error)
            reject(error)
          }
        })
      })
      
      wx.hideLoading()

      if (response && response.code === 200) {
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })

        // 重新加载用户信息
        setTimeout(() => {
          this.loadUserInfo()
        }, 1500)
        
        // 注意：由于直接使用wx.request，不会自动处理后端路由指令
        // 对于TabBar页面，这是可以接受的
      } else {
        wx.showToast({
          title: '更新失败',
          icon: 'error'
        })
      }

    } catch (error) {
      console.error('更新用户资料失败:', error)
      wx.hideLoading()
      
      // 检查是否是401错误（会话过期）
      if (error.message && error.message.includes('401')) {
        // 直接使用TabBar专用的会话过期处理
        this.handleSessionExpiredForTabBar()
      } else {
        wx.showToast({
          title: '更新失败，请重试',
          icon: 'error'
        })
      }
    }
  },

  async onLogout() {
    try {
      console.log('退出登录按钮被点击')
      
      const result = await new Promise((resolve) => {
        wx.showModal({
          title: '退出登录',
          content: '确定要退出登录吗？',
          confirmText: '确认',
          cancelText: '取消',
          success: resolve,
          fail: resolve
        })
      })
      
      console.log('确认对话框结果:', result)
      
      if (result.confirm) {
        await this.performLogout()
      }
    } catch (error) {
      console.error('Logout confirmation failed:', error)
    }
  },

  async performLogout() {
    const apiClient = app.getApiClient()
    
    try {
      console.log('开始执行退出登录流程')
      
      wx.showLoading({
        title: '正在退出...',
        mask: true
      })
      
      // 优化：总是尝试调用后端logout API，即使本地检查失败
      // 这样可以确保服务器端会话被正确清理
      try {
        console.log('调用退出登录API')
        const response = await apiClient.mobileLogout()
        console.log('退出登录API响应:', response)
        
        // 处理后端返回的路由指令
        if (response.route_command) {
          const routerHandler = app.getRouterHandler()
          if (routerHandler) {
            try {
              await routerHandler.execute(response.route_command)
            } catch (routerError) {
              console.error('Route command execution failed:', routerError)
              // 降级处理
              this.handleLogoutFallback()
            }
          } else {
            this.handleLogoutFallback()
          }
        } else {
          this.handleLogoutFallback()
        }
        
      } catch (logoutError) {
        console.log('logout API调用失败，可能是会话已过期:', logoutError)
        // 即使API调用失败，也要清理本地数据并跳转
        this.handleLogoutFallback()
      }
      
    } catch (error) {
      console.error('退出登录流程出错:', error)
      wx.hideLoading()
      this.handleLogoutFallback()
    }
  },

  /**
   * 退出登录降级处理
   */
  handleLogoutFallback() {
    console.log('Executing logout fallback')
    wx.hideLoading()
    
    // 清理本地会话数据
    app.clearUserSession()
    
    wx.showToast({
      title: '已退出登录',
      icon: 'success',
      duration: 1500
    })
    
    // 延迟跳转到登录页
    setTimeout(() => {
      console.log('Fallback: navigating to login page using wx.reLaunch')
      wx.reLaunch({
        url: '/pages/login/login',
        success: () => {
          console.log('Fallback: successfully navigated to login page')
        },
        fail: (error) => {
          console.error('Fallback: failed to navigate to login page:', error)
        }
      })
    }, 1500)
  },

  onPullDownRefresh() {
    this.loadUserInfo()
    wx.stopPullDownRefresh()
  },

  /**
   * 检查会话有效性 - TabBar页面特殊处理
   */
  async checkSessionValidity() {
    // 先检查本地会话状态
    if (!app.isLoggedIn() || !app.isSessionValid()) {
      this.handleSessionExpiredForTabBar()
      return false
    }
    
    // 对于TabBar页面，直接调用简单的API检查会话，完全绕过ApiClient的路由处理
    try {
      const sessionToken = wx.getStorageSync('authToken')
      console.log('Retrieved authToken from storage:', sessionToken ? 'Token exists' : 'No token')
      
      if (!sessionToken) {
        console.log('No auth token found in storage')
        this.handleSessionExpiredForTabBar()
        return false
      }

      // 使用需要强制认证的接口来准确检查会话状态
      // 先尝试调用update-profile接口的OPTIONS预检查，如果失败则表示认证有问题
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: 'http://192.168.3.32:8000/api/auth/current', // 使用需要认证的当前用户接口
          method: 'GET',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          success: (res) => {
            console.log(`Auth check response: ${res.statusCode}`, res.data)
            // 检查用户类型，看是否为微信用户
            if (res.data && res.data.data) {
              console.log('Current user info:', res.data.data)
              console.log('Has wx_session:', !!res.data.data.has_wx_session)
              console.log('Is WeChat user:', !!res.data.data.has_wx_session)
            }
            if (res.statusCode === 200) {
              resolve(res.data)
            } else {
              reject(new Error(`HTTP ${res.statusCode}`))
            }
          },
          fail: (error) => {
            console.error('Auth check failed:', error)
            reject(error)
          }
        })
      })
      
      // 如果返回的用户信息为空，说明会话无效
      if (!response.data) {
        console.log('Backend session validation failed, no user data returned')
        this.handleSessionExpiredForTabBar()
        return false
      }
      
      // 检查是否为微信用户（需要有has_wx_session标识）
      if (!response.data || !response.data.has_wx_session) {
        console.log('Current user is not a WeChat user or session_key is missing')
        return false
      }
      
      return true
    } catch (error) {
      // 如果返回401或其他认证错误，说明会话已过期
      if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        console.log('Backend session validation failed, session expired')
        this.handleSessionExpiredForTabBar()
        return false
      }
      // 其他错误，可能是网络问题，允许继续但给出警告
      console.warn('Session validation failed due to network error:', error)
      return true
    }
  },

  /**
   * 处理会话过期 - TabBar页面专用
   */
  handleSessionExpiredForTabBar() {
    wx.showToast({
      title: '登录已过期，请重新登录',
      icon: 'none',
      duration: 2000
    })
    
    app.clearUserSession()
    
    // 直接使用reLaunch跳转，因为从TabBar页面到登录页面需要重新启动应用
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/login/login'
      })
    }, 2000)
  },

  /**
   * 处理会话过期 - 兼容旧版本
   */
  async handleSessionExpired() {
    this.handleSessionExpiredForTabBar()
  }
})
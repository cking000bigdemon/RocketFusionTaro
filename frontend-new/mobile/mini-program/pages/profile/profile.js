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
      
      try {
        await app.handleProtectedPageAccess('/pages/profile/profile')
      } catch (error) {
        console.error('Failed to handle protected page access:', error)
        wx.navigateTo({
          url: '/pages/login/login'
        })
      }
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
      
      if (!app.isLoggedIn() || !app.isSessionValid()) {
        console.log('用户未登录或会话已失效，直接清理本地数据')
        wx.hideLoading()
        app.clearUserSession()
        wx.reLaunch({
          url: '/pages/login/login'
        })
        return
      }
      
      console.log('调用退出登录API')
      const response = await apiClient.mobileLogout()
      console.log('退出登录API响应:', response)
      
      wx.hideLoading()
      
      app.clearUserSession()
      
      wx.showToast({
        title: '已退出登录',
        icon: 'success',
        duration: 1500
      })
      
      if (response.route_command) {
        console.log('执行路由命令:', response.route_command)
        await app.getRouterHandler().execute(response.route_command)
      } else {
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/login/login'
          })
        }, 1500)
      }
      
    } catch (error) {
      wx.hideLoading()
      
      console.error('Logout failed:', error)
      
      if (error.message && error.message.includes('401')) {
        console.log('401错误，清理本地数据并跳转登录页')
        app.clearUserSession()
        wx.reLaunch({
          url: '/pages/login/login'
        })
      } else {
        console.log('其他错误，清理本地数据')
        app.clearUserSession()
        wx.showToast({
          title: '退出失败，但已清理本地数据',
          icon: 'none',
          duration: 2000
        })
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/login/login'
          })
        }, 2000)
      }
    }
  },

  onPullDownRefresh() {
    this.loadUserInfo()
    wx.stopPullDownRefresh()
  },

  /**
   * 检查会话有效性
   */
  async checkSessionValidity() {
    if (!app.isLoggedIn() || !app.isSessionValid()) {
      wx.showToast({
        title: '会话已过期',
        icon: 'none'
      })
      
      app.clearUserSession()
      
      wx.redirectTo({
        url: '/pages/login/login'
      })
      
      return false
    }
    
    return true
  }
})
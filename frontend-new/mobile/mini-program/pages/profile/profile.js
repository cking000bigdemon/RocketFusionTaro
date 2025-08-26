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

  loadUserInfo() {
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
      
      wx.redirectTo({
        url: '/pages/login/login'
      })
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
      const platformAdapter = app.getRouterHandler().platformAdapter
      const result = await platformAdapter.showConfirm(
        '退出登录',
        '确定要退出登录吗？',
        '取消',
        '确认'
      )
      
      if (result.confirm) {
        await this.performLogout()
      }
    } catch (error) {
      console.error('Logout confirmation failed:', error)
    }
  },

  async performLogout() {
    const apiClient = app.getApiClient()
    const platformAdapter = app.getRouterHandler().platformAdapter
    
    try {
      platformAdapter.showLoading('正在退出...')
      
      // 检查会话是否有效
      if (!app.isLoggedIn() || !app.isSessionValid()) {
        platformAdapter.hideLoading()
        app.clearUserSession()
        wx.reLaunch({
          url: '/pages/login/login'
        })
        return
      }
      
      const response = await apiClient.mobileLogout()
      
      platformAdapter.hideLoading()
      
      // 清理用户会话（包括7天免登录数据）
      app.clearUserSession()
      
      await platformAdapter.showToast('已退出登录', 'success')
      
      if (response.route_command) {
        await app.getRouterHandler().execute(response.route_command)
      } else {
        wx.reLaunch({
          url: '/pages/login/login'
        })
      }
      
    } catch (error) {
      platformAdapter.hideLoading()
      
      console.error('Logout failed:', error)
      
      // 遇到401错误或会话已过期，直接清理并跳转
      if (error.message && error.message.includes('401')) {
        app.clearUserSession()
        wx.reLaunch({
          url: '/pages/login/login'
        })
      } else {
        // 其他错误，但仍然清理本地会话
        app.clearUserSession()
        await platformAdapter.showToast('退出失败，但已清理本地数据', 'none')
        wx.reLaunch({
          url: '/pages/login/login'
        })
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
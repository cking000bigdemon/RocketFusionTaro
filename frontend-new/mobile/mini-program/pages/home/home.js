const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    isLoggedIn: false,
    showProfilePrompt: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    await this.loadUserInfo()
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  async onShow() {
    await this.loadUserInfo()
  },

  /**
   * 加载用户信息 - 按照CLAUDE.md标准认证检查模式
   */
  async loadUserInfo() {
    const userInfo = app.getUserInfo()
    const isLoggedIn = app.isLoggedIn()
    const isSessionValid = app.isSessionValid()
    
    // 首先更新UI状态
    this.setData({
      userInfo: userInfo,
      isLoggedIn: isLoggedIn && isSessionValid
    })
    
    if (!isLoggedIn || !isSessionValid) {
      if (isLoggedIn && !isSessionValid) {
        app.clearUserSession()
        wx.showToast({
          title: '登录已过期',
          icon: 'none'
        })
      }
      
      // 非阻塞式处理：不等待后端响应，避免导航超时
      // 由于home是TabBar页面，应该避免阻塞式认证检查
      console.log('User not authenticated, but continuing to load home page (TabBar)')
      
      // 可选：异步静默检查认证状态，但不阻塞页面加载
      setTimeout(async () => {
        try {
          const response = await app.globalData.apiClient.authStatus({ 
            current_path: '/pages/home/home' 
          })
          
          if (response.route_command && response.route_command.type === 'NavigateTo') {
            const targetPath = response.route_command.payload?.path
            if (targetPath && targetPath.includes('/login/login')) {
              // 只有在必要时才导航到登录页
              wx.reLaunch({ url: '/pages/login/login' })
            }
          }
        } catch (error) {
          console.log('Background auth check failed, user can continue using home page')
        }
      }, 100)
      
      return
    }

    // 认证通过，检查是否需要完善用户资料
    console.log('User authenticated, home page ready')
    this.checkUserProfileNeed()
  },

  /**
   * 检查用户是否需要完善头像昵称
   */
  checkUserProfileNeed() {
    const userInfo = this.data.userInfo
    
    // 只有微信用户且未设置头像昵称才提示
    if (userInfo && userInfo.is_guest && 
        (!userInfo.full_name || !userInfo.avatar_url)) {
      
      // 检查是否已经询问过（避免重复弹窗）
      const hasPrompted = wx.getStorageSync('profile_prompt_shown_' + userInfo.id)
      if (!hasPrompted) {
        // 延迟500ms显示弹窗，确保页面已完全渲染
        setTimeout(() => {
          this.setData({ showProfilePrompt: true })
        }, 500)
      }
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  navigateToChat() {
    wx.navigateTo({
      url: '/pages/chat/chat'
    })
  },

  navigateToTools() {
    wx.navigateTo({
      url: '/pages/tools/tools'
    })
  },

  navigateToProfile() {
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  },

  navigateToHelp() {
    wx.navigateTo({
      url: '/pages/help/help'
    })
  },

  quickStartChat() {
    this.navigateToChat()
  },

  /**
   * 处理完善资料弹窗 - 用户点击取消
   */
  onProfilePromptCancel() {
    const userInfo = this.data.userInfo
    if (userInfo) {
      // 记录已询问过，避免重复弹窗
      wx.setStorageSync('profile_prompt_shown_' + userInfo.id, true)
    }
    this.setData({ showProfilePrompt: false })
  },

  /**
   * 处理完善资料弹窗 - 用户点击获取
   */
  async onProfilePromptConfirm() {
    const userInfo = this.data.userInfo
    if (userInfo) {
      // 记录已询问过
      wx.setStorageSync('profile_prompt_shown_' + userInfo.id, true)
    }
    
    this.setData({ showProfilePrompt: false })
    
    // 开始获取用户资料
    await this.updateUserProfile()
  },

  /**
   * 获取用户资料信息
   */
  getUserProfile() {
    return new Promise((resolve, reject) => {
      // 检查是否支持getUserProfile
      if (!wx.getUserProfile) {
        console.warn('wx.getUserProfile not supported, trying getUserInfo')
        // 降级到getUserInfo（已废弃但可能仍有效）
        wx.getUserInfo({
          success: resolve,
          fail: reject
        })
        return
      }

      wx.getUserProfile({
        desc: '用于完善会员资料',
        lang: 'zh_CN',
        success: (res) => {
          console.log('getUserProfile success:', res)
          resolve(res)
        },
        fail: (error) => {
          console.error('getUserProfile failed:', error)
          
          // 如果用户拒绝授权，不要当作错误处理
          if (error.errMsg && error.errMsg.includes('auth deny')) {
            console.log('User denied profile authorization')
            reject(new Error('User denied authorization'))
          } else {
            reject(error)
          }
        }
      })
    })
  },

  /**
   * 更新用户资料
   */
  async updateUserProfile() {
    wx.showLoading({
      title: '获取资料中...'
    })

    try {
      // 获取用户资料
      const userProfileData = await this.getUserProfile()
      console.log('Got user profile data for update:', userProfileData)
      
      const apiClient = app.getApiClient()
      if (!apiClient) {
        throw new Error('API客户端未初始化')
      }

      // 调用专门的用户信息更新接口
      const updateData = {
        encrypted_data: userProfileData.encryptedData,
        iv: userProfileData.iv,
        signature: userProfileData.signature,
        raw_data: userProfileData.rawData
      }

      const response = await apiClient.post('/api/auth/update-profile', updateData)
      console.log('User profile update response:', response)
      
      wx.hideLoading()
      wx.showToast({
        title: '头像昵称已更新',
        icon: 'success',
        duration: 2000
      })

      // 刷新用户信息
      setTimeout(() => {
        this.loadUserInfo()
      }, 1000)

    } catch (error) {
      wx.hideLoading()
      console.error('Failed to update user profile:', error)
      
      if (error.message && error.message.includes('User denied authorization')) {
        wx.showToast({
          title: '已跳过头像昵称设置',
          icon: 'none',
          duration: 2000
        })
      } else {
        wx.showToast({
          title: '头像昵称更新失败',
          icon: 'error',
          duration: 2000
        })
      }
    }
  }
})
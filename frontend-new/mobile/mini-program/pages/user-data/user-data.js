const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    isLoggedIn: false,
    userData: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    await this.checkAuth()
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
    await this.checkAuth()
  },

  /**
   * 检查认证状态
   */
  async checkAuth() {
    const currentUrl = '/pages/user-data/user-data'
    
    if (!app.checkPageAccess(currentUrl, true)) {
      await app.handleProtectedPageAccess(currentUrl)
      return false
    }

    this.setData({
      userInfo: app.getUserInfo(),
      isLoggedIn: app.isLoggedIn()
    })

    await this.loadUserData()
    return true
  },

  /**
   * 加载用户数据
   */
  async loadUserData() {
    try {
      const response = await app.getApiClient().mobileGetUserData()
      if (response.data) {
        this.setData({
          userData: response.data
        })
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
      wx.showToast({
        title: '加载数据失败',
        icon: 'error'
      })
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

  }
})
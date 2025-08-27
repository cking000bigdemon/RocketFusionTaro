const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    isLoggedIn: false
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
    const currentUrl = '/pages/home/home'
    
    if (!app.checkPageAccess(currentUrl, true)) {
      await app.handleProtectedPageAccess(currentUrl)
      return false
    }

    this.setData({
      userInfo: app.getUserInfo(),
      isLoggedIn: app.isLoggedIn()
    })

    return true
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
  }
})
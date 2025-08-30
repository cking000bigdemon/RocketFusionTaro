const app = getApp()

Page({
  data: {
    webviewUrl: '',  // AI知识库默认链接将在onLoad中设置
    isLoading: true,
    hasError: false,
    errorMessage: ''
  },

  onLoad() {
    console.log('AI知识库页面开始加载')
    
    // 从全局配置获取AI知识库的webview链接
    const config = app.globalData.config
    console.log('获取到的全局配置:', config)
    
    if (config && config.aiKnowledge && config.aiKnowledge.webviewUrl) {
      const url = config.aiKnowledge.webviewUrl
      this.setData({
        webviewUrl: url,
        isLoading: true,
        hasError: false
      })
      console.log('AI知识库WebView URL已设置为:', url)
      
      // 验证URL格式
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        console.warn('WebView URL格式可能有问题:', url)
      }
    } else {
      // 降级处理：使用默认链接
      const fallbackUrl = 'https://www.baidu.com'  // 使用更可靠的测试地址
      this.setData({
        webviewUrl: fallbackUrl,
        isLoading: true,
        hasError: false
      })
      console.warn('配置获取失败，使用默认链接:', fallbackUrl)
      console.warn('全局配置详情:', {
        configExists: !!config,
        aiKnowledgeExists: !!(config && config.aiKnowledge),
        webviewUrlExists: !!(config && config.aiKnowledge && config.aiKnowledge.webviewUrl)
      })
    }
    
    // 延迟检查WebView是否加载
    setTimeout(() => {
      if (this.data.isLoading) {
        console.warn('WebView加载超时，可能存在问题')
      }
    }, 10000)
  },

  onWebViewLoad() {
    console.log('AI知识库网页加载完成')
    this.setData({
      isLoading: false,
      hasError: false
    })
  },

  onWebViewError(e) {
    console.error('AI知识库网页加载失败:', e)
    this.setData({
      isLoading: false,
      hasError: true,
      errorMessage: e.detail ? JSON.stringify(e.detail) : '未知错误'
    })
    
    wx.showModal({
      title: 'WebView加载失败',
      content: `加载错误：${e.detail ? JSON.stringify(e.detail) : '未知错误'}\n\n当前URL：${this.data.webviewUrl}`,
      showCancel: true,
      confirmText: '重试',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          // 重试加载
          this.setData({
            isLoading: true,
            hasError: false,
            webviewUrl: this.data.webviewUrl + '?t=' + Date.now()  // 添加时间戳避免缓存
          })
        } else {
          // 返回上一页
          wx.navigateBack()
        }
      }
    })
  },

  onShow() {
    console.log('AI知识库页面显示')
    console.log('当前WebView URL:', this.data.webviewUrl)
  },

  onHide() {
    console.log('AI知识库页面隐藏')
  },

  // 手动重新加载WebView
  onReloadTap() {
    console.log('用户点击重新加载')
    this.setData({
      isLoading: true,
      hasError: false,
      webviewUrl: this.data.webviewUrl.split('?')[0] + '?t=' + Date.now()
    })
  }
})
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
    
    // 解析错误详情
    let errorMsg = '未知错误'
    if (e.detail) {
      if (typeof e.detail === 'string') {
        errorMsg = e.detail
      } else if (e.detail.errMsg) {
        errorMsg = e.detail.errMsg
      } else {
        errorMsg = JSON.stringify(e.detail)
      }
    }
    
    this.setData({
      isLoading: false,
      hasError: true,
      errorMessage: errorMsg
    })
    
    // 提供更详细的错误提示和解决方案
    const errorTips = this.getErrorTips(errorMsg)
    
    wx.showModal({
      title: 'WebView加载失败',
      content: `${errorTips}\n\n当前URL：${this.data.webviewUrl}`,
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
  },
  
  // 获取错误提示
  getErrorTips(errorMsg) {
    if (errorMsg.includes('域名') || errorMsg.includes('domain')) {
      return '错误原因：域名未配置\n\n解决方案：\n1. 在微信公众平台配置业务域名\n2. 确保域名已备案\n3. 使用HTTPS协议'
    } else if (errorMsg.includes('证书') || errorMsg.includes('certificate') || errorMsg.includes('SSL')) {
      return '错误原因：HTTPS证书问题\n\n解决方案：\n1. 检查证书是否有效\n2. 确保证书链完整\n3. 避免使用自签名证书'
    } else if (errorMsg.includes('网络') || errorMsg.includes('network')) {
      return '错误原因：网络连接问题\n\n解决方案：\n1. 检查网络连接\n2. 确认服务器是否可访问\n3. 检查防火墙设置'
    } else {
      return `错误信息：${errorMsg}\n\n可能原因：\n1. 域名未在小程序后台配置\n2. HTTPS证书问题\n3. 服务器无法访问`
    }
  }
})
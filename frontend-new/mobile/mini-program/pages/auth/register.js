const app = getApp()

Page({
  data: {
    form: {
      username: '',
      password: '',
      confirmPassword: '',
      email: '',
      phone: ''
    },
    isLoading: false
  },

  onLoad(options) {
    console.log('Register page loaded')
  },

  onUsernameInput(e) {
    this.setData({
      'form.username': e.detail.value
    })
  },

  onPasswordInput(e) {
    this.setData({
      'form.password': e.detail.value
    })
  },

  onConfirmPasswordInput(e) {
    this.setData({
      'form.confirmPassword': e.detail.value
    })
  },

  onEmailInput(e) {
    this.setData({
      'form.email': e.detail.value
    })
  },

  onPhoneInput(e) {
    this.setData({
      'form.phone': e.detail.value
    })
  },

  async handleRegister() {
    const { username, password, confirmPassword, email, phone } = this.data.form
    
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
    
    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码输入不一致',
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
      
      const response = await apiClient.register({
        username: username.trim(),
        password: password,
        confirm_password: confirmPassword,
        email: email.trim(),
        phone: phone.trim()
      })

      console.log('Register API called successfully:', response)

    } catch (error) {
      console.error('Register failed:', error)
      
      let errorMessage = '注册失败，请重试'
      
      if (error.message.includes('用户名已存在')) {
        errorMessage = '用户名已存在'
      } else if (error.message.includes('Network error')) {
        errorMessage = '网络连接失败，请检查网络'
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

  goToLogin() {
    wx.navigateBack()
  }
})
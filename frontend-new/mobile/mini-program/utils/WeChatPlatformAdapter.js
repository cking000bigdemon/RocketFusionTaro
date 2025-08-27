/**
 * 微信小程序平台适配器
 * 实现RouterHandler所需的平台特定操作
 */

class WeChatPlatformAdapter {
    constructor() {
        this.platform = 'weapp'
        this.systemInfo = null
        this.initSystemInfo()
    }

    /**
     * 初始化系统信息
     */
    initSystemInfo() {
        try {
            this.systemInfo = wx.getSystemInfoSync()
        } catch (error) {
            console.error('Failed to get system info:', error)
        }
    }

    /**
     * 页面导航
     * @param {string} url - 目标URL
     * @param {boolean} replace - 是否替换当前页面
     */
    async navigateTo(url, replace = false) {
        return new Promise((resolve, reject) => {
            // 格式化URL为小程序路径
            const miniProgramPath = this.formatUrlForMiniProgram(url)
            
            const options = {
                url: miniProgramPath,
                success: resolve,
                fail: (error) => {
                    console.error('Navigation failed:', error)
                    reject(new Error(`Navigation to ${miniProgramPath} failed: ${error.errMsg}`))
                }
            }

            // 检查是否是TabBar页面
            if (this.isTabBarPage(miniProgramPath)) {
                // TabBar页面使用switchTab
                wx.switchTab(options)
            } else if (replace) {
                wx.redirectTo(options)
            } else {
                // 特殊处理：从TabBar页面导航到登录页时使用reLaunch
                const currentPages = getCurrentPages()
                const currentPage = currentPages[currentPages.length - 1]
                const currentPath = currentPage ? currentPage.route : ''
                
                if (this.isTabBarPage(currentPath) && miniProgramPath.includes('login')) {
                    // 从TabBar页面跳转到登录页，使用reLaunch避免导航超时
                    wx.reLaunch(options)
                } else {
                    wx.navigateTo(options)
                }
            }
        })
    }

    /**
     * 检查页面是否是TabBar页面
     * @param {string} path - 小程序路径
     * @returns {boolean} 是否是TabBar页面
     */
    isTabBarPage(path) {
        // 移除路径开头的斜杠和查询参数
        const cleanPath = path.replace(/^\//, '').split('?')[0]
        
        // TabBar页面列表 (根据app.json配置)
        const tabBarPages = [
            'pages/home/home',
            'pages/user-data/user-data',
            'pages/profile/profile'
        ]
        
        return tabBarPages.includes(cleanPath)
    }

    /**
     * 格式化URL为小程序路径
     * @param {string} url - 原始URL
     * @returns {string} 小程序路径
     */
    formatUrlForMiniProgram(url) {
        // 如果已经是完整的小程序路径格式，直接返回
        if (url.startsWith('/pages/')) {
            return url
        }
        
        // 移除开头的斜杠并转换为小程序页面路径
        let path = url.startsWith('/') ? url.slice(1) : url
        
        // URL路由到小程序页面的映射
        const routeMap = {
            'login': '/pages/login/login',
            'home': '/pages/home/home',
            'profile': '/pages/profile/profile',
            'user-data': '/pages/user-data/user-data'
        }
        
        // 分离路径和查询参数
        const [routePath, queryString] = path.split('?')
        
        // 查找对应的小程序页面路径
        const miniProgramPage = routeMap[routePath] || `/pages/${routePath}/${routePath}`
        
        // 拼接查询参数
        if (queryString) {
            return `${miniProgramPage}?${queryString}`
        }
        
        return miniProgramPage
    }

    /**
     * 显示Toast提示
     * @param {string} message - 提示信息
     * @param {string} type - 提示类型: 'success', 'error', 'info', 'none', 'loading'
     * @param {number} duration - 显示时长(ms)
     */
    async showToast(message, type = 'none', duration = 2000) {
        return new Promise((resolve) => {
            const iconMap = {
                success: 'success',
                error: 'error',
                info: 'none',
                none: 'none',
                loading: 'loading'
            }

            wx.showToast({
                title: message,
                icon: iconMap[type] || 'none',
                duration: duration,
                mask: type === 'loading',
                success: resolve,
                fail: resolve
            })
        })
    }

    /**
     * 显示警告对话框
     * @param {string} title - 标题
     * @param {string} content - 内容
     */
    async showAlert(title, content) {
        return new Promise((resolve) => {
            wx.showModal({
                title: title || '提示',
                content: content || '',
                showCancel: false,
                confirmText: '确定',
                success: (res) => {
                    resolve({ confirm: res.confirm })
                },
                fail: () => {
                    resolve({ confirm: false })
                }
            })
        })
    }

    /**
     * 显示确认对话框
     * @param {string} title - 标题
     * @param {string} content - 内容
     * @param {string} cancelText - 取消按钮文字
     * @param {string} confirmText - 确认按钮文字
     * @returns {Promise<{confirm: boolean, cancel: boolean}>}
     */
    async showConfirm(title, content, cancelText = '取消', confirmText = '确定') {
        return new Promise((resolve) => {
            wx.showModal({
                title: title || '确认',
                content: content || '',
                showCancel: true,
                cancelText: cancelText,
                confirmText: confirmText,
                success: (res) => {
                    resolve({ 
                        confirm: res.confirm, 
                        cancel: res.cancel 
                    })
                },
                fail: () => {
                    resolve({ confirm: false, cancel: true })
                }
            })
        })
    }

    /**
     * 获取当前页面路径
     * @returns {string}
     */
    getCurrentPath() {
        const pages = getCurrentPages()
        if (pages.length > 0) {
            const currentPage = pages[pages.length - 1]
            return `/${currentPage.route}`
        }
        return '/'
    }

    /**
     * 设置页面标题
     * @param {string} title - 页面标题
     */
    async setPageTitle(title) {
        return new Promise((resolve) => {
            wx.setNavigationBarTitle({
                title: title,
                success: resolve,
                fail: resolve
            })
        })
    }

    /**
     * 获取平台信息
     * @returns {Object} 平台信息对象
     */
    getPlatformInfo() {
        return {
            platform: 'weapp',
            version: wx.getAccountInfoSync().miniProgram.version,
            envVersion: wx.getAccountInfoSync().miniProgram.envVersion,
            systemInfo: this.systemInfo,
            screenSize: {
                width: this.systemInfo?.windowWidth || 0,
                height: this.systemInfo?.windowHeight || 0
            },
            safeArea: this.systemInfo?.safeArea || {},
            statusBarHeight: this.systemInfo?.statusBarHeight || 0
        }
    }

    /**
     * 显示加载状态
     * @param {string} title - 加载提示文字
     */
    showLoading(title = '加载中...') {
        wx.showLoading({
            title: title,
            mask: true
        })
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        wx.hideLoading()
    }

    /**
     * 显示操作菜单
     * @param {Array} itemList - 菜单选项
     * @returns {Promise<number>} 选中的索引
     */
    async showActionSheet(itemList) {
        return new Promise((resolve, reject) => {
            wx.showActionSheet({
                itemList: itemList,
                success: (res) => resolve(res.tapIndex),
                fail: reject
            })
        })
    }

    /**
     * 振动反馈
     * @param {string} type - 振动类型: 'light', 'medium', 'heavy'
     */
    vibrate(type = 'light') {
        if (wx.vibrateShort) {
            wx.vibrateShort({
                type: type
            })
        }
    }

    /**
     * 复制到剪贴板
     * @param {string} data - 要复制的文本
     * @returns {Promise<boolean>}
     */
    async setClipboardData(data) {
        return new Promise((resolve) => {
            wx.setClipboardData({
                data: data,
                success: () => {
                    this.showToast('已复制到剪贴板', 'success')
                    resolve(true)
                },
                fail: () => {
                    this.showToast('复制失败', 'error')
                    resolve(false)
                }
            })
        })
    }

    /**
     * 获取剪贴板数据
     * @returns {Promise<string>}
     */
    async getClipboardData() {
        return new Promise((resolve, reject) => {
            wx.getClipboardData({
                success: (res) => resolve(res.data),
                fail: reject
            })
        })
    }

    /**
     * 预览图片
     * @param {Array} urls - 图片链接数组
     * @param {number} current - 当前显示图片的索引
     */
    async previewImage(urls, current = 0) {
        return new Promise((resolve, reject) => {
            wx.previewImage({
                urls: urls,
                current: typeof current === 'number' ? urls[current] : current,
                success: resolve,
                fail: reject
            })
        })
    }

    /**
     * 选择图片
     * @param {Object} options - 选择选项
     * @returns {Promise<Array>}
     */
    async chooseImage(options = {}) {
        const defaultOptions = {
            count: 9,
            sizeType: ['original', 'compressed'],
            sourceType: ['album', 'camera']
        }
        
        return new Promise((resolve, reject) => {
            wx.chooseImage({
                ...defaultOptions,
                ...options,
                success: (res) => resolve(res.tempFilePaths),
                fail: reject
            })
        })
    }

    /**
     * 保存图片到相册
     * @param {string} filePath - 图片文件路径
     * @returns {Promise<boolean>}
     */
    async saveImageToPhotosAlbum(filePath) {
        return new Promise((resolve) => {
            wx.saveImageToPhotosAlbum({
                filePath: filePath,
                success: () => {
                    this.showToast('已保存到相册', 'success')
                    resolve(true)
                },
                fail: (error) => {
                    if (error.errMsg.includes('auth deny')) {
                        this.showToast('请授权访问相册', 'none')
                    } else {
                        this.showToast('保存失败', 'error')
                    }
                    resolve(false)
                }
            })
        })
    }

    /**
     * 获取网络状态
     * @returns {Promise<Object>}
     */
    async getNetworkType() {
        return new Promise((resolve, reject) => {
            wx.getNetworkType({
                success: (res) => resolve({
                    networkType: res.networkType,
                    isConnected: res.networkType !== 'none'
                }),
                fail: reject
            })
        })
    }

    /**
     * 监听网络状态变化
     * @param {Function} callback - 回调函数
     */
    onNetworkStatusChange(callback) {
        wx.onNetworkStatusChange(callback)
    }

    /**
     * 获取位置信息
     * @param {string} type - 位置精度: 'wgs84', 'gcj02'
     * @returns {Promise<Object>}
     */
    async getLocation(type = 'wgs84') {
        return new Promise((resolve, reject) => {
            wx.getLocation({
                type: type,
                success: resolve,
                fail: reject
            })
        })
    }

    /**
     * 打开位置选择
     * @returns {Promise<Object>}
     */
    async chooseLocation() {
        return new Promise((resolve, reject) => {
            wx.chooseLocation({
                success: resolve,
                fail: reject
            })
        })
    }

    /**
     * 打开地图查看位置
     * @param {Object} location - 位置信息
     */
    async openLocation(location) {
        return new Promise((resolve, reject) => {
            wx.openLocation({
                latitude: location.latitude,
                longitude: location.longitude,
                name: location.name || '',
                address: location.address || '',
                scale: location.scale || 18,
                success: resolve,
                fail: reject
            })
        })
    }

    /**
     * 拨打电话
     * @param {string} phoneNumber - 电话号码
     */
    async makePhoneCall(phoneNumber) {
        return new Promise((resolve, reject) => {
            wx.makePhoneCall({
                phoneNumber: phoneNumber,
                success: resolve,
                fail: reject
            })
        })
    }

    /**
     * 扫码
     * @param {Object} options - 扫码选项
     * @returns {Promise<Object>}
     */
    async scanCode(options = {}) {
        const defaultOptions = {
            scanType: ['barCode', 'qrCode']
        }
        
        return new Promise((resolve, reject) => {
            wx.scanCode({
                ...defaultOptions,
                ...options,
                success: resolve,
                fail: reject
            })
        })
    }

    /**
     * 返回上一页
     * @param {number} delta - 返回层数
     */
    goBack(delta = 1) {
        const pages = getCurrentPages()
        if (pages.length > delta) {
            wx.navigateBack({ delta })
        } else {
            // 如果没有足够的页面可以返回，则跳转到首页
            wx.reLaunch({ url: '/pages/home/home' })
        }
    }

    /**
     * 重新启动小程序到指定页面
     * @param {string} url - 目标页面路径
     */
    async reLaunch(url) {
        return new Promise((resolve, reject) => {
            const miniProgramPath = this.formatUrlForMiniProgram(url)
            
            wx.reLaunch({
                url: miniProgramPath,
                success: resolve,
                fail: reject
            })
        })
    }

    /**
     * 切换到TabBar页面
     * @param {string} url - TabBar页面路径
     */
    async switchTab(url) {
        return new Promise((resolve, reject) => {
            const miniProgramPath = this.formatUrlForMiniProgram(url)
            
            wx.switchTab({
                url: miniProgramPath,
                success: resolve,
                fail: reject
            })
        })
    }

    /**
     * 获取当前页面实例
     * @returns {Object|null}
     */
    getCurrentPage() {
        const pages = getCurrentPages()
        return pages.length > 0 ? pages[pages.length - 1] : null
    }

    /**
     * 设置导航栏颜色
     * @param {Object} options - 颜色配置
     */
    async setNavigationBarColor(options) {
        return new Promise((resolve, reject) => {
            wx.setNavigationBarColor({
                ...options,
                success: resolve,
                fail: reject
            })
        })
    }

    /**
     * 显示导航栏加载动画
     */
    showNavigationBarLoading() {
        wx.showNavigationBarLoading()
    }

    /**
     * 隐藏导航栏加载动画
     */
    hideNavigationBarLoading() {
        wx.hideNavigationBarLoading()
    }
}

module.exports = WeChatPlatformAdapter
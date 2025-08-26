/**
 * Vue3 + H5平台适配器
 * 实现RouterHandler所需的平台特定操作
 */
import { showDialog, showToast, showConfirmDialog } from 'vant'
import router from '../router'

class VueH5PlatformAdapter {
    constructor() {
        this.router = router
    }

    /**
     * 页面导航
     * @param {string} url - 目标URL
     * @param {boolean} replace - 是否替换当前页面
     */
    async navigateTo(url, replace = false) {
        try {
            // 转换微信小程序路径为H5路径
            const h5Url = this.convertMiniProgramPathToH5(url)
            
            // 执行导航
            if (replace) {
                await this.router.replace(h5Url)
            } else {
                await this.router.push(h5Url)
            }
        } catch (error) {
            // 处理导航失败的情况
            console.error('Navigation failed:', error)
            throw error
        }
    }

    /**
     * 转换微信小程序路径为H5路径
     * @param {string} miniPath - 微信小程序路径
     * @returns {string} H5路径
     */
    convertMiniProgramPathToH5(miniPath) {
        // 路径映射表
        const pathMap = {
            '/pages/index/index': '/home',
            '/pages/login/login': '/login',
            '/pages/home/home': '/home',
            '/pages/profile/profile': '/profile',
            '/pages/user-data/user-data': '/user-data'
        }

        // 如果已经是H5路径格式，直接返回
        if (miniPath.startsWith('/') && !miniPath.includes('/pages/')) {
            return miniPath
        }

        // 转换微信小程序路径
        const h5Path = pathMap[miniPath]
        if (h5Path) {
            console.log(`🔄 Path conversion: ${miniPath} → ${h5Path}`)
            return h5Path
        }

        // 如果没有找到对应的映射，尝试自动转换
        if (miniPath.includes('/pages/')) {
            const segments = miniPath.split('/')
            if (segments.length >= 3) {
                const pageName = segments[2] // /pages/[pageName]/[pageName]
                const converted = `/${pageName}`
                console.log(`🔄 Auto conversion: ${miniPath} → ${converted}`)
                return converted
            }
        }

        // 默认返回原路径
        console.warn(`⚠️ Unknown path format: ${miniPath}`)
        return miniPath
    }

    /**
     * 显示Toast提示
     * @param {string} message - 提示信息
     * @param {string} type - 提示类型: 'success', 'error', 'info', 'none', 'loading'
     * @param {number} duration - 显示时长(ms)
     */
    async showToast(message, type = 'none', duration = 2000) {
        const iconMap = {
            success: 'success',
            error: 'fail',
            info: 'none',
            none: 'none',
            loading: 'loading'
        }

        showToast({
            message,
            icon: iconMap[type] || 'none',
            duration,
            forbidClick: type === 'loading'
        })
    }

    /**
     * 显示警告对话框
     * @param {string} title - 标题
     * @param {string} content - 内容
     */
    async showAlert(title, content) {
        return new Promise((resolve) => {
            showDialog({
                title,
                message: content,
                showCancelButton: false,
                confirmButtonText: '确定'
            }).then(() => {
                resolve({ confirm: true })
            }).catch(() => {
                resolve({ confirm: false })
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
            showConfirmDialog({
                title,
                message: content,
                cancelButtonText: cancelText,
                confirmButtonText: confirmText
            }).then(() => {
                resolve({ confirm: true, cancel: false })
            }).catch(() => {
                resolve({ confirm: false, cancel: true })
            })
        })
    }

    /**
     * 获取当前页面路径
     * @returns {string}
     */
    getCurrentPath() {
        return this.router.currentRoute.value.path
    }

    /**
     * 设置页面标题
     * @param {string} title - 页面标题
     */
    async setPageTitle(title) {
        document.title = title
    }

    /**
     * 获取平台信息
     * @returns {Object} 平台信息对象
     */
    getPlatformInfo() {
        return {
            platform: 'h5',
            version: '1.0.0',
            userAgent: navigator.userAgent,
            screenSize: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            viewport: {
                width: document.documentElement.clientWidth,
                height: document.documentElement.clientHeight
            }
        }
    }

    /**
     * 获取设备信息
     * @returns {Object}
     */
    getDeviceInfo() {
        const ua = navigator.userAgent
        const isAndroid = /Android/i.test(ua)
        const isIOS = /iPhone|iPad|iPod/i.test(ua)
        const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
        const isWeChat = /MicroMessenger/i.test(ua)
        
        return {
            isAndroid,
            isIOS,
            isMobile,
            isWeChat,
            userAgent: ua
        }
    }

    /**
     * 显示加载状态
     * @param {string} message - 加载提示文字
     */
    showLoading(message = '加载中...') {
        this.currentToast = showToast({
            message,
            icon: 'loading',
            duration: 0,
            forbidClick: true
        })
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        // Vant的showToast返回实例，需要调用close方法
        if (this.currentToast) {
            this.currentToast.close()
            this.currentToast = null
        }
    }

    /**
     * 复制到剪贴板
     * @param {string} text - 要复制的文本
     * @returns {Promise<boolean>}
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text)
                return true
            } else {
                // 兼容旧浏览器
                const textArea = document.createElement('textarea')
                textArea.value = text
                textArea.style.position = 'fixed'
                textArea.style.opacity = '0'
                document.body.appendChild(textArea)
                textArea.select()
                const successful = document.execCommand('copy')
                document.body.removeChild(textArea)
                return successful
            }
        } catch (error) {
            console.error('Copy to clipboard failed:', error)
            return false
        }
    }

    /**
     * 振动反馈
     * @param {number} duration - 振动时长(ms)
     */
    vibrate(duration = 50) {
        if (navigator.vibrate) {
            navigator.vibrate(duration)
        }
    }

    /**
     * 获取网络状态
     * @returns {Object}
     */
    getNetworkStatus() {
        if (navigator.connection) {
            return {
                online: navigator.onLine,
                type: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            }
        }
        return {
            online: navigator.onLine,
            type: 'unknown'
        }
    }

    /**
     * 监听网络状态变化
     * @param {Function} callback - 回调函数
     */
    onNetworkChange(callback) {
        window.addEventListener('online', () => callback({ online: true }))
        window.addEventListener('offline', () => callback({ online: false }))
    }

    /**
     * 页面可见性变化监听
     * @param {Function} callback - 回调函数
     */
    onVisibilityChange(callback) {
        document.addEventListener('visibilitychange', () => {
            callback({
                visible: !document.hidden,
                state: document.visibilityState
            })
        })
    }

    /**
     * 返回上一页
     */
    goBack() {
        if (window.history.length > 1) {
            this.router.back()
        } else {
            this.router.replace('/')
        }
    }

    /**
     * 刷新当前页面
     */
    refresh() {
        window.location.reload()
    }

    /**
     * 滚动到顶部
     * @param {number} duration - 动画时长
     */
    scrollToTop(duration = 300) {
        const startPosition = window.pageYOffset
        const startTime = Date.now()

        const animateScroll = () => {
            const elapsed = Date.now() - startTime
            const progress = elapsed / duration
            
            if (progress < 1) {
                const easeProgress = 1 - Math.pow(1 - progress, 3)
                window.scrollTo(0, startPosition * (1 - easeProgress))
                requestAnimationFrame(animateScroll)
            } else {
                window.scrollTo(0, 0)
            }
        }

        animateScroll()
    }

    /**
     * 生成分享数据
     * @param {Object} shareData - 分享数据
     * @returns {Object}
     */
    prepareShareData(shareData) {
        const { title, text, url } = shareData
        return {
            title: title || document.title,
            text: text || '',
            url: url || window.location.href
        }
    }

    /**
     * 原生分享（如果支持）
     * @param {Object} shareData - 分享数据
     * @returns {Promise<boolean>}
     */
    async share(shareData) {
        if (navigator.share) {
            try {
                await navigator.share(this.prepareShareData(shareData))
                return true
            } catch (error) {
                console.error('Share failed:', error)
                return false
            }
        }
        return false
    }
}

export default VueH5PlatformAdapter
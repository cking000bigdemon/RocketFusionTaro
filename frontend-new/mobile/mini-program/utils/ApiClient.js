/**
 * 微信小程序API客户端
 * 基于wx.request实现，集成全局路由指令拦截器
 */

class ApiClient {
    constructor(routerHandler = null) {
        this.routerHandler = routerHandler
        this.baseURL = ''
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        }
        this.requestInterceptors = []
        this.responseInterceptors = []
    }

    /**
     * 设置基础URL
     */
    setBaseURL(url) {
        this.baseURL = url
    }

    /**
     * 设置默认请求头
     */
    setDefaultHeaders(headers) {
        this.defaultHeaders = { ...this.defaultHeaders, ...headers }
    }

    /**
     * 设置认证token
     */
    setMobileAuth(token) {
        if (token) {
            this.defaultHeaders.Authorization = `Bearer ${token}`
        } else {
            delete this.defaultHeaders.Authorization
        }
    }

    /**
     * 获取当前认证token
     */
    getAuthToken() {
        const authHeader = this.defaultHeaders.Authorization
        return authHeader ? authHeader.replace('Bearer ', '') : null
    }

    /**
     * 清除认证信息
     */
    clearAuth() {
        delete this.defaultHeaders.Authorization
    }

    /**
     * 检查是否已认证
     */
    isAuthenticated() {
        return !!this.defaultHeaders.Authorization
    }

    /**
     * 发送请求的通用方法
     */
    async request(method, url, data = null, options = {}) {
        const fullUrl = this.buildFullURL(url)
        
        const requestConfig = {
            url: fullUrl,
            method: method.toUpperCase(),
            header: {
                ...this.defaultHeaders,
                ...options.headers
            },
            timeout: options.timeout || 10000,
            ...options
        }

        if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
            requestConfig.data = data
        }

        try {
            // 执行请求拦截器
            for (const interceptor of this.requestInterceptors) {
                requestConfig = await interceptor(requestConfig) || requestConfig
            }

            // 发送请求
            const response = await this.wxRequest(requestConfig)
            
            // 执行响应拦截器
            let processedResponse = response
            for (const interceptor of this.responseInterceptors) {
                processedResponse = await interceptor(processedResponse) || processedResponse
            }

            // 自动处理路由指令（核心功能）
            await this.handleRouteCommand(processedResponse.data)

            return processedResponse.data

        } catch (error) {
            console.error('Request failed:', error)
            
            // 处理401错误，自动清理会话
            if (error.message && error.message.includes('HTTP 401')) {
                await this.handle401Error()
            }
            
            // 显示错误提示（如果未禁用）
            if (options.showErrorToast !== false && this.routerHandler) {
                await this.routerHandler.platformAdapter.showToast('请求失败，请重试', 'error')
            }
            
            throw error
        }
    }

    /**
     * 包装wx.request为Promise
     */
    wxRequest(config) {
        return new Promise((resolve, reject) => {
            wx.request({
                ...config,
                success: (res) => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(res)
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.data?.message || 'Request failed'}`))
                    }
                },
                fail: (error) => {
                    reject(new Error(`Network error: ${error.errMsg}`))
                }
            })
        })
    }

    /**
     * 处理401错误，清理会话并跳转登录页
     */
    async handle401Error() {
        try {
            const app = getApp()
            if (app && app.clearUserSession) {
                app.clearUserSession()
                console.log('Session cleared due to 401 error')
                
                // 跳转到登录页
                wx.reLaunch({
                    url: '/pages/login/login'
                })
            }
        } catch (error) {
            console.error('Failed to handle 401 error:', error)
        }
    }

    /**
     * 处理响应中的路由指令
     */
    async handleRouteCommand(responseData) {
        if (!responseData || !responseData.route_command) {
            return
        }

        if (!this.routerHandler) {
            console.warn('ApiClient: No routerHandler provided, skipping route command execution')
            return
        }

        try {
            // 执行路由指令
            await this.routerHandler.execute(responseData.route_command)
        } catch (error) {
            console.error('ApiClient: Route command execution failed:', error)
            
            // 路由指令执行失败不应该影响业务数据的返回
            // 但可以记录错误用于监控
        }
    }

    /**
     * 构建完整的请求URL
     */
    buildFullURL(url) {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url
        }

        const baseUrl = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL
        const path = url.startsWith('/') ? url : `/${url}`
        
        return `${baseUrl}${path}`
    }

    /**
     * GET请求
     */
    async get(url, params = {}, options = {}) {
        // 将params转换为查询字符串
        if (Object.keys(params).length > 0) {
            const queryParams = []
            Object.entries(params).forEach(([key, value]) => {
                queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
            })
            url += `?${queryParams.join('&')}`
        }

        return this.request('GET', url, null, options)
    }

    /**
     * POST请求
     */
    async post(url, data = {}, options = {}) {
        return this.request('POST', url, data, options)
    }

    /**
     * PUT请求
     */
    async put(url, data = {}, options = {}) {
        return this.request('PUT', url, data, options)
    }

    /**
     * DELETE请求
     */
    async delete(url, options = {}) {
        return this.request('DELETE', url, null, options)
    }

    // ========================
    // C端API方法 (移动端使用)
    // ========================

    /**
     * C端用户登录
     */
    async mobileLogin(credentials) {
        return this.post('/api/auth/login', credentials)
    }

    /**
     * C端用户注册
     */
    async register(userData) {
        return this.post('/api/auth/register', userData)
    }

    /**
     * C端用户登出
     */
    async mobileLogout() {
        try {
            return await this.post('/api/auth/logout')
        } catch (error) {
            // 即使登出接口失败，也要清理本地会话
            if (error.message && error.message.includes('HTTP 401')) {
                await this.handle401Error()
            }
            throw error
        }
    }

    /**
     * C端获取用户信息
     */
    async mobileGetUserInfo() {
        return this.get('/api/user/info')
    }

    /**
     * C端更新用户信息
     */
    async mobileUpdateUserInfo(userInfo) {
        return this.put('/api/user/info', userInfo)
    }

    /**
     * C端获取用户数据列表
     */
    async mobileGetUserData(params = {}) {
        return this.get('/api/user-data', params)
    }

    /**
     * C端添加用户数据
     */
    async mobileAddUserData(data) {
        return this.post('/api/user-data', data)
    }

    /**
     * C端更新用户数据
     */
    async mobileUpdateUserData(id, data) {
        return this.put(`/api/user-data/${id}`, data)
    }

    /**
     * C端删除用户数据
     */
    async mobileDeleteUserData(id) {
        return this.delete(`/api/user-data/${id}`)
    }

    /**
     * 检查认证状态（用于受保护页面访问控制）
     */
    async authStatus(params = {}) {
        return this.get('/auth/status', params)
    }

    // ========================
    // 公共API方法
    // ========================

    /**
     * 获取系统健康状态
     */
    async getHealthStatus() {
        return this.get('/api/public/health')
    }

    /**
     * 获取系统配置信息
     */
    async getSystemConfig() {
        return this.get('/api/public/config')
    }

    /**
     * 上报客户端错误
     */
    async reportError(errorInfo) {
        return this.post('/api/public/error/report', errorInfo)
    }

    /**
     * 上报路由指令执行指标
     */
    async reportRouteCommandMetrics(metrics) {
        return this.post('/api/public/metrics/route-command-error', metrics)
    }

    // ========================
    // 微信小程序特有API
    // ========================

    /**
     * 微信登录
     */
    async wxLogin(code, userInfo = null) {
        return this.post('/api/mobile/auth/wx-login', {
            code: code,
            userInfo: userInfo
        })
    }

    /**
     * 绑定微信用户
     */
    async bindWxUser(encryptedData, iv) {
        return this.post('/api/mobile/user/bind-wx', {
            encryptedData: encryptedData,
            iv: iv
        })
    }

    /**
     * 获取微信用户手机号
     */
    async getWxPhoneNumber(encryptedData, iv) {
        return this.post('/api/mobile/user/wx-phone', {
            encryptedData: encryptedData,
            iv: iv
        })
    }

    /**
     * 上传文件到微信云存储
     */
    async uploadToWxCloud(filePath, cloudPath) {
        return new Promise((resolve, reject) => {
            wx.cloud.uploadFile({
                cloudPath: cloudPath,
                filePath: filePath,
                success: resolve,
                fail: reject
            })
        })
    }

    /**
     * 从微信云存储下载文件
     */
    async downloadFromWxCloud(fileID) {
        return new Promise((resolve, reject) => {
            wx.cloud.downloadFile({
                fileID: fileID,
                success: resolve,
                fail: reject
            })
        })
    }

    // ========================
    // 拦截器管理
    // ========================

    /**
     * 添加请求拦截器
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor)
    }

    /**
     * 添加响应拦截器
     */
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor)
    }

    /**
     * 移除请求拦截器
     */
    removeRequestInterceptor(interceptor) {
        const index = this.requestInterceptors.indexOf(interceptor)
        if (index > -1) {
            this.requestInterceptors.splice(index, 1)
        }
    }

    /**
     * 移除响应拦截器
     */
    removeResponseInterceptor(interceptor) {
        const index = this.responseInterceptors.indexOf(interceptor)
        if (index > -1) {
            this.responseInterceptors.splice(index, 1)
        }
    }
}

module.exports = ApiClient
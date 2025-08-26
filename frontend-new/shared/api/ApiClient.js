/**
 * 统一API客户端
 * 提供C端和B端的API调用方法
 * C端API自动处理路由指令，B端API返回传统JSON响应
 */
import RequestInterceptor from '../interceptors/RequestInterceptor.js'

class ApiClient {
    constructor(routerHandler = null) {
        // C端请求拦截器（带路由指令处理）
        this.mobileInterceptor = new RequestInterceptor(routerHandler)
        this.mobileInterceptor.setBaseURL('/api')

        // B端请求拦截器（无路由指令处理）
        this.adminInterceptor = new RequestInterceptor(null)
        this.adminInterceptor.setBaseURL('/api')

        // 公共API拦截器（一般不包含路由指令）
        this.publicInterceptor = new RequestInterceptor(null)
        this.publicInterceptor.setBaseURL('/api')
    }

    /**
     * 设置RouterHandler（用于C端API）
     * @param {Object} routerHandler - RouterHandler实例
     */
    setRouterHandler(routerHandler) {
        this.mobileInterceptor = new RequestInterceptor(routerHandler)
        this.mobileInterceptor.setBaseURL('/api')
    }

    // ========================
    // C端API方法 (移动端使用)
    // ========================

    /**
     * C端用户登录
     * @param {Object} credentials - 登录凭据
     * @returns {Promise<Object>} 响应数据
     */
    async mobileLogin(credentials) {
        return this.mobileInterceptor.post('/auth/login', credentials)
    }

    /**
     * C端用户登出
     * @returns {Promise<Object>} 响应数据
     */
    async mobileLogout() {
        return this.mobileInterceptor.post('/auth/logout')
    }

    /**
     * C端获取用户信息
     * @returns {Promise<Object>} 响应数据
     */
    async mobileGetUserInfo() {
        return this.mobileInterceptor.get('/user/info')
    }

    /**
     * C端更新用户信息
     * @param {Object} userInfo - 用户信息
     * @returns {Promise<Object>} 响应数据
     */
    async mobileUpdateUserInfo(userInfo) {
        return this.mobileInterceptor.put('/user/info', userInfo)
    }

    /**
     * C端获取用户数据列表
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>} 响应数据
     */
    async mobileGetUserData(params = {}) {
        return this.mobileInterceptor.get('/user-data', params)
    }

    /**
     * C端添加用户数据
     * @param {Object} data - 用户数据
     * @returns {Promise<Object>} 响应数据
     */
    async mobileAddUserData(data) {
        return this.mobileInterceptor.post('/user-data', data)
    }

    /**
     * C端更新用户数据
     * @param {string} id - 数据ID
     * @param {Object} data - 更新的数据
     * @returns {Promise<Object>} 响应数据
     */
    async mobileUpdateUserData(id, data) {
        return this.mobileInterceptor.put(`/user-data/${id}`, data)
    }

    /**
     * C端删除用户数据
     * @param {string} id - 数据ID
     * @returns {Promise<Object>} 响应数据
     */
    async mobileDeleteUserData(id) {
        return this.mobileInterceptor.delete(`/user-data/${id}`)
    }

    // ========================
    // B端API方法 (管理端使用)
    // ========================

    /**
     * B端管理员登录
     * @param {Object} credentials - 登录凭据
     * @returns {Promise<Object>} 响应数据
     */
    async adminLogin(credentials) {
        return this.adminInterceptor.post('/auth/login', credentials)
    }

    /**
     * B端管理员登出
     * @returns {Promise<Object>} 响应数据
     */
    async adminLogout() {
        return this.adminInterceptor.post('/auth/logout')
    }

    /**
     * B端获取用户列表
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>} 响应数据
     */
    async adminGetUserList(params = {}) {
        return this.adminInterceptor.get('/users', params)
    }

    /**
     * B端创建用户
     * @param {Object} userData - 用户数据
     * @returns {Promise<Object>} 响应数据
     */
    async adminCreateUser(userData) {
        return this.adminInterceptor.post('/users', userData)
    }

    /**
     * B端更新用户
     * @param {string} userId - 用户ID
     * @param {Object} userData - 用户数据
     * @returns {Promise<Object>} 响应数据
     */
    async adminUpdateUser(userId, userData) {
        return this.adminInterceptor.put(`/users/${userId}`, userData)
    }

    /**
     * B端删除用户
     * @param {string} userId - 用户ID
     * @returns {Promise<Object>} 响应数据
     */
    async adminDeleteUser(userId) {
        return this.adminInterceptor.delete(`/users/${userId}`)
    }

    /**
     * B端获取系统统计信息
     * @returns {Promise<Object>} 响应数据
     */
    async adminGetSystemStats() {
        return this.adminInterceptor.get('/system/stats')
    }

    /**
     * B端获取用户数据列表（管理视角）
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>} 响应数据
     */
    async adminGetUserDataList(params = {}) {
        return this.adminInterceptor.get('/user-data', params)
    }

    // ========================
    // 公共API方法
    // ========================

    /**
     * 获取系统健康状态
     * @returns {Promise<Object>} 响应数据
     */
    async getHealthStatus() {
        return this.publicInterceptor.get('/health')
    }

    /**
     * 获取系统详细健康状态
     * @returns {Promise<Object>} 响应数据
     */
    async getSystemHealthStatus() {
        return this.publicInterceptor.post('/metrics/health')
    }

    /**
     * 获取系统配置信息
     * @returns {Promise<Object>} 响应数据
     */
    async getSystemConfig() {
        return this.publicInterceptor.get('/config')
    }

    /**
     * 上报客户端错误
     * @param {Object} errorInfo - 错误信息
     * @returns {Promise<Object>} 响应数据
     */
    async reportError(errorInfo) {
        return this.publicInterceptor.post('/error/report', errorInfo)
    }

    /**
     * 上报路由指令执行指标
     * @param {Object} metrics - 指标数据
     * @returns {Promise<Object>} 响应数据
     */
    async reportRouteCommandMetrics(metrics) {
        return this.publicInterceptor.post('/metrics/route-command-error', metrics)
    }

    // ========================
    // 工具方法
    // ========================

    /**
     * 设置C端认证信息
     * @param {string} token - 认证token或session
     */
    setMobileAuth(token) {
        this.mobileInterceptor.setAuthToken(token)
    }

    /**
     * 设置B端认证信息
     * @param {string} token - 认证token
     */
    setAdminAuth(token) {
        this.adminInterceptor.setAuthToken(token)
    }

    /**
     * 清除所有认证信息
     */
    clearAuth() {
        this.mobileInterceptor.setAuthToken(null)
        this.adminInterceptor.setAuthToken(null)
    }

    /**
     * 获取C端请求拦截器实例（用于扩展）
     * @returns {RequestInterceptor}
     */
    getMobileInterceptor() {
        return this.mobileInterceptor
    }

    /**
     * 获取B端请求拦截器实例（用于扩展）
     * @returns {RequestInterceptor}
     */
    getAdminInterceptor() {
        return this.adminInterceptor
    }

    /**
     * 获取公共请求拦截器实例
     * @returns {RequestInterceptor}
     */
    getPublicInterceptor() {
        return this.publicInterceptor
    }
}

// 创建单例实例
const apiClient = new ApiClient()

export default apiClient
export { ApiClient }
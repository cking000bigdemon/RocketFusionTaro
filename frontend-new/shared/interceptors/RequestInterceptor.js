/**
 * 全局请求拦截器
 * 自动处理所有API响应中的route_command字段
 * 实现零代码侵入的路由指令处理
 */
import { isDevelopment } from '../utils/env.js'
class RequestInterceptor {
    constructor(routerHandler) {
        this.routerHandler = routerHandler
        this.baseURL = '' // 可配置的API基础URL
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        }
    }

    /**
     * 设置基础URL
     * @param {string} url - API基础URL
     */
    setBaseURL(url) {
        this.baseURL = url
    }

    /**
     * 设置默认请求头
     * @param {Object} headers - 请求头对象
     */
    setDefaultHeaders(headers) {
        this.defaultHeaders = { ...this.defaultHeaders, ...headers }
    }

    /**
     * 发送POST请求
     * @param {string} url - 请求URL
     * @param {Object} data - 请求数据
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>} 响应数据
     */
    async post(url, data = {}, options = {}) {
        return this.request('POST', url, data, options)
    }

    /**
     * 发送GET请求
     * @param {string} url - 请求URL
     * @param {Object} params - 查询参数
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>} 响应数据
     */
    async get(url, params = {}, options = {}) {
        // 将params转换为查询字符串
        if (Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams()
            Object.entries(params).forEach(([key, value]) => {
                searchParams.append(key, String(value))
            })
            url += `?${searchParams.toString()}`
        }

        return this.request('GET', url, null, options)
    }

    /**
     * 发送PUT请求
     * @param {string} url - 请求URL
     * @param {Object} data - 请求数据
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>} 响应数据
     */
    async put(url, data = {}, options = {}) {
        return this.request('PUT', url, data, options)
    }

    /**
     * 发送DELETE请求
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>} 响应数据
     */
    async delete(url, options = {}) {
        return this.request('DELETE', url, null, options)
    }

    /**
     * 通用请求方法
     * @param {string} method - HTTP方法
     * @param {string} url - 请求URL
     * @param {Object} data - 请求数据
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>} 响应数据
     */
    async request(method, url, data = null, options = {}) {
        const fullUrl = this.buildFullURL(url)
        
        const config = {
            method,
            headers: {
                ...this.defaultHeaders,
                ...options.headers
            },
            ...options
        }

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data)
        }

        try {
            const response = await fetch(fullUrl, config)
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const responseData = await response.json()

            // 自动处理路由指令（核心功能）
            await this.handleRouteCommand(responseData)

            return responseData

        } catch (error) {
            console.error('Request failed:', error)
            
            // 可以在这里添加全局错误处理
            if (options.showErrorToast !== false) {
                await this.routerHandler?.showGenericError()
            }
            
            throw error
        }
    }

    /**
     * 处理响应中的路由指令
     * @param {Object} responseData - 响应数据
     */
    async handleRouteCommand(responseData) {
        if (!responseData || !responseData.route_command) {
            return
        }

        if (!this.routerHandler) {
            if (isDevelopment()) {
                console.log('RequestInterceptor: B-end mode - skipping route command execution (expected behavior)')
            }
            return
        }

        try {
            // 执行路由指令
            await this.routerHandler.execute(responseData.route_command)
        } catch (error) {
            console.error('RequestInterceptor: Route command execution failed:', error)
            
            // 路由指令执行失败不应该影响业务数据的返回
            // 但可以记录错误用于监控
        }
    }

    /**
     * 构建完整的请求URL
     * @param {string} url - 原始URL
     * @returns {string} 完整URL
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
     * 添加请求拦截器（在发送请求前执行）
     * @param {Function} interceptor - 拦截器函数
     */
    addRequestInterceptor(interceptor) {
        // 可以扩展为支持多个拦截器的数组
        this.requestInterceptor = interceptor
    }

    /**
     * 添加响应拦截器（在处理响应后执行）
     * @param {Function} interceptor - 拦截器函数
     */
    addResponseInterceptor(interceptor) {
        this.responseInterceptor = interceptor
    }

    /**
     * 设置认证token
     * @param {string} token - 认证token
     */
    setAuthToken(token) {
        if (token) {
            this.defaultHeaders.Authorization = `Bearer ${token}`
        } else {
            delete this.defaultHeaders.Authorization
        }
    }

    /**
     * 设置会话ID（用于session-based认证）
     * @param {string} sessionId - 会话ID
     */
    setSessionId(sessionId) {
        if (sessionId) {
            this.defaultHeaders['Session-ID'] = sessionId
        } else {
            delete this.defaultHeaders['Session-ID']
        }
    }
}

export default RequestInterceptor
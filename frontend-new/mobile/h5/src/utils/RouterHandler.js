/**
 * Vue3 H5版本的RouterHandler
 * 基于共享的RouterHandlerCore，使用VueH5PlatformAdapter
 */
import RouterHandlerCore from '@shared/router/RouterHandlerCore.js'
import VueH5PlatformAdapter from './VueH5PlatformAdapter.js'

class VueH5RouterHandler extends RouterHandlerCore {
    constructor(store) {
        const platformAdapter = new VueH5PlatformAdapter()
        super(store, platformAdapter)
        this.platform = 'h5'
    }

    /**
     * 初始化RouterHandler
     * @param {Object} router - Vue Router实例
     * @param {Object} store - Pinia store实例
     */
    init(router, store) {
        this.router = router
        this.store = store
        this.platformAdapter.router = router
        
        // 监听路由变化，记录导航历史
        if (router) {
            router.beforeEach((to, from, next) => {
                if (this.debugMode) {
                    console.log(`🧭 Route change: ${from.path} → ${to.path}`)
                }
                next()
            })
        }

        // 监听页面可见性变化
        this.platformAdapter.onVisibilityChange((visibilityInfo) => {
            if (this.debugMode) {
                console.log('👁️ Visibility changed:', visibilityInfo)
            }
        })

        // 监听网络状态变化
        this.platformAdapter.onNetworkChange((networkInfo) => {
            if (this.debugMode) {
                console.log('📡 Network changed:', networkInfo)
            }
            
            // 网络恢复时可以重试失败的请求
            if (networkInfo.online && this.failedRequests.length > 0) {
                this.retryFailedRequests()
            }
        })

        // 添加全局错误处理
        this.setupGlobalErrorHandling()
    }

    /**
     * 设置全局错误处理
     */
    setupGlobalErrorHandling() {
        // 捕获未处理的Promise错误
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason)
            this.reportError({
                type: 'unhandledrejection',
                message: event.reason?.message || 'Unknown promise rejection',
                stack: event.reason?.stack
            })
        })

        // 捕获全局JavaScript错误
        window.addEventListener('error', (event) => {
            console.error('Global JavaScript error:', event.error)
            this.reportError({
                type: 'javascript',
                message: event.error?.message || event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            })
        })
    }

    /**
     * 上报错误到后端
     * @param {Object} errorInfo - 错误信息
     */
    async reportError(errorInfo) {
        try {
            const platformInfo = this.platformAdapter.getPlatformInfo()
            const errorReport = {
                ...errorInfo,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: platformInfo.userAgent,
                platform: this.platform,
                userId: this.store?.user?.id || null
            }

            // 这里可以调用API上报错误
            // await api.reportError(errorReport)
            console.log('Error report:', errorReport)
        } catch (error) {
            console.error('Failed to report error:', error)
        }
    }

    /**
     * 扩展的导航方法，支持更多Vue Router特性
     * @param {string|Object} to - 目标路由
     * @param {boolean} replace - 是否替换当前页面
     * @param {Object} options - 导航选项
     */
    async navigateToRoute(to, replace = false, options = {}) {
        try {
            const routeLocation = typeof to === 'string' ? { path: to } : to
            
            if (options.query) {
                routeLocation.query = options.query
            }
            
            if (options.params) {
                routeLocation.params = options.params
            }

            if (replace) {
                await this.router.replace(routeLocation)
            } else {
                await this.router.push(routeLocation)
            }
        } catch (error) {
            console.error('Route navigation failed:', error)
            throw error
        }
    }

    /**
     * 智能导航 - 根据路由类型选择最佳导航方式
     * @param {string} path - 路径
     * @param {Object} options - 选项
     */
    async smartNavigate(path, options = {}) {
        const { params, query, replace, external } = options

        if (external) {
            // 外部链接
            window.open(path, '_blank')
            return
        }

        // 检查是否为内部路由
        const route = this.router.resolve({ path, params: params || {}, query: query || {} })
        
        if (route.matched.length === 0) {
            // 路由不存在，可能需要回退处理
            console.warn(`Route not found: ${path}`)
            await this.platformAdapter.showToast('页面不存在', 'error')
            return
        }

        // 执行导航
        await this.navigateToRoute({ path, params: params || {}, query: query || {} }, replace)
    }

    /**
     * 带确认的导航
     * @param {string} path - 目标路径
     * @param {string} message - 确认信息
     * @param {Object} options - 导航选项
     */
    async navigateWithConfirm(path, message = '确定要离开当前页面吗？', options = {}) {
        const result = await this.platformAdapter.showConfirm('确认导航', message)
        
        if (result.confirm) {
            await this.smartNavigate(path, options)
        }
    }

    /**
     * 带动画的导航
     * @param {string} path - 目标路径
     * @param {string} transition - 过渡动画类型
     * @param {Object} options - 导航选项
     */
    async navigateWithTransition(path, transition = 'slide-left', options = {}) {
        // 设置过渡动画
        if (this.router.currentRoute.value.meta) {
            this.router.currentRoute.value.meta.transition = transition
        }

        await this.smartNavigate(path, options)
    }

    /**
     * 预加载路由组件
     * @param {string} routeName - 路由名称
     */
    async preloadRoute(routeName) {
        try {
            const route = this.router.resolve({ name: routeName })
            if (route.matched.length > 0) {
                // Vue 3中可以通过动态导入预加载组件
                const component = route.matched[0].components?.default
                if (typeof component === 'function') {
                    await component()
                }
            }
        } catch (error) {
            console.warn(`Failed to preload route ${routeName}:`, error)
        }
    }

    /**
     * 获取路由历史信息
     * @returns {Object}
     */
    getNavigationInfo() {
        const currentRoute = this.router.currentRoute.value
        return {
            current: {
                path: currentRoute.path,
                name: currentRoute.name,
                params: currentRoute.params,
                query: currentRoute.query,
                meta: currentRoute.meta
            },
            canGoBack: window.history.length > 1,
            platform: this.platform,
            timestamp: Date.now()
        }
    }

    /**
     * 清理资源
     */
    destroy() {
        // 清理事件监听器
        this.clearExecutionHistory()
        this.fallbackStack = []
        
        // 移除错误处理器
        window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
        window.removeEventListener('error', this.handleGlobalError)
    }
}

// 创建单例实例
let routerHandlerInstance = null

/**
 * 获取RouterHandler单例
 * @param {Object} store - Pinia store实例
 * @returns {VueH5RouterHandler}
 */
export function getRouterHandler(store = null) {
    if (!routerHandlerInstance) {
        routerHandlerInstance = new VueH5RouterHandler(store)
    }
    return routerHandlerInstance
}

/**
 * 初始化RouterHandler
 * @param {Object} router - Vue Router实例
 * @param {Object} store - Pinia store实例
 * @returns {VueH5RouterHandler}
 */
export function initRouterHandler(router, store) {
    const handler = getRouterHandler(store)
    handler.init(router, store)
    return handler
}

export default VueH5RouterHandler
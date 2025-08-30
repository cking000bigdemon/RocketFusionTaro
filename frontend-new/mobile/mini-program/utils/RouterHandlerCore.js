/**
 * 微信小程序版本的RouterHandler核心逻辑
 * 基于共享的RouterHandlerCore，适配小程序环境
 * 
 * 注意：这是共享RouterHandlerCore的小程序适配版本
 * 由于小程序不支持ES6模块，这里使用CommonJS格式
 */

/**
 * 路由指令版本常量
 */
const ROUTE_COMMAND_VERSION = 2

/**
 * RouterHandler核心类 - 小程序版本
 */
class RouterHandlerCore {
    constructor(globalData, platformAdapter) {
        this.globalData = globalData // 小程序全局数据
        this.platformAdapter = platformAdapter
        this.debugMode = false // 默认关闭调试模式
        this.executionHistory = []
        this.fallbackStack = []
    }

    /**
     * 执行路由指令（支持版本化指令）
     * @param {Object} routeCommand - 路由指令对象（可能是版本化的）
     */
    async execute(routeCommand) {
        if (!routeCommand) {
            console.warn('RouterHandler: No route command to execute')
            return
        }

        // 生成执行ID用于追踪
        const executionId = this.generateExecutionId()

        if (this.debugMode) {
            console.group(`🚀 RouterHandler: Executing Command [${executionId}]`)
            console.log('Input:', routeCommand)
        }

        const startTime = Date.now()
        
        try {
            // 检查是否为版本化指令
            if (this.isVersionedCommand(routeCommand)) {
                await this.executeVersionedCommand(routeCommand, executionId)
            } else {
                // 直接执行原始指令
                await this.executeCommand(routeCommand, executionId)
            }

            const endTime = Date.now()
            const duration = endTime - startTime
            
            // 记录成功执行
            this.recordExecution(executionId, routeCommand, 'success', null, { duration })

        } catch (error) {
            const endTime = Date.now()
            const duration = endTime - startTime
            
            console.error(`❌ RouterHandler: Command execution failed [${executionId}]:`, error)
            
            // 记录失败执行
            this.recordExecution(executionId, routeCommand, 'error', error.message, { duration })
            
            // 尝试执行回退指令
            await this.handleExecutionError(routeCommand, error, executionId)

        } finally {
            if (this.debugMode) {
                console.groupEnd()
            }
        }
    }

    /**
     * 检查是否为版本化指令
     */
    isVersionedCommand(command) {
        return command.hasOwnProperty('version') && command.hasOwnProperty('command')
    }

    /**
     * 执行版本化指令
     */
    async executeVersionedCommand(versionedCommand, executionId) {
        const { version, command, fallback, metadata } = versionedCommand

        // 检查版本兼容性
        if (!this.checkVersionCompatibility(version)) {
            console.warn(`RouterHandler: Version incompatible. Server: ${version}, Client supports: ${ROUTE_COMMAND_VERSION}`)
            
            // 尝试执行回退指令
            if (fallback) {
                console.log(`RouterHandler: Executing fallback command [${executionId}]`)
                await this.execute(fallback)
                return
            } else {
                throw new Error(`Unsupported route command version: ${version}`)
            }
        }

        // 设置回退指令到栈中
        if (fallback) {
            this.fallbackStack.push({ executionId, fallback })
        }

        // 执行实际指令
        await this.executeCommand(command, executionId)

        // 执行完成，清理回退栈
        this.clearFallbackForExecution(executionId)
    }

    /**
     * 检查版本兼容性
     */
    checkVersionCompatibility(serverVersion) {
        // 主版本号必须匹配
        const serverMajor = Math.floor(serverVersion / 100)
        const clientMajor = Math.floor(ROUTE_COMMAND_VERSION / 100)
        return serverMajor === clientMajor
    }

    /**
     * 执行具体指令
     */
    async executeCommand(routeCommand, executionId) {
        switch (routeCommand.type) {
            case 'NavigateTo':
                return this.handleNavigateTo(routeCommand.payload, executionId)
            
            case 'ShowDialog':
                return this.handleShowDialog(routeCommand.payload, executionId)
            
            case 'ProcessData':
                return this.handleProcessData(routeCommand.payload, executionId)
            
            case 'Sequence':
                return this.handleSequence(routeCommand.payload, executionId)
            
            case 'Conditional':
                return this.handleConditional(routeCommand.payload, executionId)
            
            case 'Delay':
                return this.handleDelay(routeCommand.payload, executionId)
            
            case 'Parallel':
                return this.handleParallel(routeCommand.payload, executionId)
            
            case 'Retry':
                return this.handleRetry(routeCommand.payload, executionId)
            
            default:
                throw new Error(`Unknown route command type: ${routeCommand.type}`)
        }
    }

    /**
     * 处理页面导航指令
     */
    async handleNavigateTo({ path, params, replace, fallback_path }, executionId) {
        try {
            let url = path
            
            // 添加查询参数
            if (params) {
                const queryParams = []
                Object.entries(params).forEach(([key, value]) => {
                    queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
                })
                if (queryParams.length > 0) {
                    url += `?${queryParams.join('&')}`
                }
            }

            if (this.debugMode) {
                console.log(`[${executionId}] Navigating to: ${url} (replace: ${replace})`)
            }

            // 委托给平台适配器处理实际导航
            await this.platformAdapter.navigateTo(url, replace)

        } catch (error) {
            console.error(`[${executionId}] Navigation failed:`, error)
            
            // 尝试使用回退路径
            if (fallback_path) {
                console.log(`[${executionId}] Trying fallback path: ${fallback_path}`)
                try {
                    await this.platformAdapter.navigateTo(fallback_path, replace)
                    return // 成功执行回退路径
                } catch (fallbackError) {
                    console.error(`[${executionId}] Fallback navigation also failed:`, fallbackError)
                }
            }
            
            // 显示用户友好的错误提示
            await this.platformAdapter.showToast('页面跳转失败', 'error')
            throw error
        }
    }

    /**
     * 处理显示对话框指令
     */
    async handleShowDialog({ dialog_type, title, content, actions }, executionId) {
        if (this.debugMode) {
            console.log(`[${executionId}] Showing dialog: ${dialog_type}`)
        }

        switch (dialog_type) {
            case 'Alert':
                await this.platformAdapter.showAlert(title || '提示', content || '')
                break

            case 'Confirm':
                if (actions && actions.length > 0) {
                    const result = await this.platformAdapter.showConfirm(
                        title || '确认', 
                        content || '',
                        actions[0]?.text || '取消',
                        actions[1]?.text || '确定'
                    )

                    if (result.confirm && actions[1]?.action) {
                        await this.execute(actions[1].action)
                    } else if (result.cancel && actions[0]?.action) {
                        await this.execute(actions[0].action)
                    }
                } else {
                    await this.platformAdapter.showAlert(title || '确认', content || '')
                }
                break

            case 'Toast':
                await this.platformAdapter.showToast(content || title || '提示', 'none')
                break

            default:
                console.warn(`[${executionId}] Unknown dialog type: ${dialog_type}`)
        }
    }

    /**
     * 处理数据处理指令
     */
    async handleProcessData({ data_type, data, merge }, executionId) {
        if (this.debugMode) {
            console.log(`[${executionId}] Processing data: ${data_type}`)
            console.log('Data:', data)
        }

        if (!this.globalData) {
            console.warn(`[${executionId}] No global data provided for data processing`)
            return
        }

        switch (data_type) {
            case 'user':
                if (data === null || data === undefined) {
                    // 清除用户数据
                    this.globalData.userInfo = null
                    try {
                        wx.removeStorageSync('userInfo')
                        wx.removeStorageSync('authToken')
                        wx.removeStorageSync('login_time')
                    } catch (error) {
                        console.error('Failed to clear user storage:', error)
                    }
                } else if (merge && this.globalData.userInfo) {
                    // 合并用户数据
                    this.globalData.userInfo = { ...this.globalData.userInfo, ...data }
                    try {
                        wx.setStorageSync('userInfo', this.globalData.userInfo)
                    } catch (error) {
                        console.error('Failed to save user info:', error)
                    }
                } else {
                    // 检查是否是包含session_token的完整登录响应
                    if (data.session_token && data.user) {
                        // 这是完整的登录响应，需要正确保存会话数据
                        const { session_token, user, expires_at } = data
                        this.globalData.userInfo = user
                        
                        try {
                            // 保存用户信息
                            wx.setStorageSync('userInfo', user)
                            // 保存认证令牌
                            wx.setStorageSync('authToken', session_token)
                            // 保存登录时间
                            wx.setStorageSync('login_time', Date.now())
                            
                            console.log('User session saved via ProcessData:', user.username)
                        } catch (error) {
                            console.error('Failed to save session data:', error)
                        }
                    } else {
                        // 普通的用户数据更新
                        this.globalData.userInfo = data
                        try {
                            wx.setStorageSync('userInfo', data)
                        } catch (error) {
                            console.error('Failed to save user info:', error)
                        }
                    }
                }
                break
            
            case 'userList':
                this.globalData.userList = data || []
                break
            
            case 'settings':
                if (merge && this.globalData.settings) {
                    this.globalData.settings = { ...this.globalData.settings, ...data }
                } else {
                    this.globalData.settings = data || {}
                }
                try {
                    wx.setStorageSync('appSettings', this.globalData.settings)
                } catch (error) {
                    console.error('Failed to save settings:', error)
                }
                break
            
            case 'cache':
                if (!this.globalData.cache) {
                    this.globalData.cache = {}
                }
                if (data && typeof data === 'object') {
                    this.globalData.cache = { ...this.globalData.cache, ...data }
                }
                break
            
            default:
                console.warn(`[${executionId}] Unknown data type: ${data_type}`)
        }
    }

    /**
     * 处理序列指令
     */
    async handleSequence({ commands, stop_on_error = true }, executionId) {
        if (this.debugMode) {
            console.log(`[${executionId}] Executing ${commands.length} commands (stop_on_error: ${stop_on_error})`)
        }
        
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i]
            try {
                await this.execute(command)
            } catch (error) {
                console.error(`[${executionId}] Command ${i + 1} failed:`, error)
                
                if (stop_on_error) {
                    console.log(`[${executionId}] Stopping sequence execution due to error`)
                    throw error
                } else {
                    console.log(`[${executionId}] Continuing sequence execution despite error`)
                }
            }
        }
    }

    /**
     * 处理条件指令
     */
    async handleConditional({ condition, if_true, if_false }, executionId) {
        if (this.debugMode) {
            console.log(`[${executionId}] Evaluating condition: ${condition}`)
        }

        try {
            const conditionResult = this.evaluateCondition(condition)
            
            if (conditionResult && if_true) {
                await this.execute(if_true)
            } else if (!conditionResult && if_false) {
                await this.execute(if_false)
            }
        } catch (error) {
            console.error(`[${executionId}] Conditional execution failed:`, error)
            throw error
        }
    }

    /**
     * 处理延迟指令
     */
    async handleDelay({ duration_ms, command }, executionId) {
        if (this.debugMode) {
            console.log(`[${executionId}] Delaying execution for ${duration_ms}ms`)
        }

        await new Promise(resolve => setTimeout(resolve, duration_ms))
        await this.execute(command)
    }

    /**
     * 处理并行指令
     */
    async handleParallel({ commands, wait_for_all = true }, executionId) {
        if (this.debugMode) {
            console.log(`[${executionId}] Executing ${commands.length} commands in parallel (wait_for_all: ${wait_for_all})`)
        }

        const promises = commands.map(command => this.execute(command))

        if (wait_for_all) {
            await Promise.all(promises)
        } else {
            // Fire and forget
            promises.forEach(promise => {
                promise.catch(error => {
                    console.error(`[${executionId}] Parallel command failed (ignored):`, error)
                })
            })
        }
    }

    /**
     * 处理重试指令
     */
    async handleRetry({ command, max_attempts, delay_ms }, executionId) {
        if (this.debugMode) {
            console.log(`[${executionId}] Retry command: max_attempts=${max_attempts}, delay=${delay_ms}ms`)
        }

        let lastError
        for (let attempt = 1; attempt <= max_attempts; attempt++) {
            try {
                await this.execute(command)
                if (this.debugMode) {
                    console.log(`[${executionId}] Retry succeeded on attempt ${attempt}`)
                }
                return // 成功执行，退出重试循环
            } catch (error) {
                lastError = error
                console.warn(`[${executionId}] Attempt ${attempt} failed:`, error)
                
                if (attempt < max_attempts) {
                    await new Promise(resolve => setTimeout(resolve, delay_ms))
                }
            }
        }

        // 所有重试都失败了
        console.error(`[${executionId}] All ${max_attempts} retry attempts failed`)
        throw lastError
    }

    /**
     * 评估条件表达式
     */
    evaluateCondition(condition) {
        try {
            // 简化的条件评估，在小程序环境中需要谨慎处理
            const context = {
                user: this.globalData.userInfo || null,
                userInfo: this.globalData.userInfo || null,
                // 添加一些实用的helper函数
                isEmpty: (value) => !value || value.length === 0,
                isAdmin: () => this.globalData.userInfo?.is_admin || false,
                isLoggedIn: () => !!this.globalData.userInfo,
            }

            // 简单的条件处理，避免使用eval
            if (condition === 'isLoggedIn') {
                return context.isLoggedIn()
            } else if (condition === 'isAdmin') {
                return context.isAdmin()
            } else if (condition.startsWith('!')) {
                return !this.evaluateCondition(condition.substring(1))
            }

            // 更复杂的条件可以在这里添加
            console.warn('Unsupported condition:', condition)
            return false

        } catch (error) {
            console.error('RouterHandler: Condition evaluation failed:', error)
            return false
        }
    }

    /**
     * 处理执行错误
     */
    async handleExecutionError(originalCommand, error, executionId) {
        // 检查是否有回退指令
        const fallbackEntry = this.fallbackStack.find(entry => entry.executionId === executionId)
        
        if (fallbackEntry) {
            console.log(`[${executionId}] Executing fallback command due to error`)
            try {
                await this.execute(fallbackEntry.fallback)
            } catch (fallbackError) {
                console.error(`[${executionId}] Fallback command also failed:`, fallbackError)
                await this.showGenericError()
            }
        } else {
            await this.showGenericError()
        }
    }

    /**
     * 显示通用错误提示
     */
    async showGenericError() {
        await this.platformAdapter.showToast('操作失败，请重试', 'error')
    }

    /**
     * 生成执行ID
     */
    generateExecutionId() {
        return Math.random().toString(36).substr(2, 9)
    }

    /**
     * 清理指定执行的回退栈
     */
    clearFallbackForExecution(executionId) {
        this.fallbackStack = this.fallbackStack.filter(entry => entry.executionId !== executionId)
    }

    /**
     * 记录执行历史
     */
    recordExecution(executionId, command, status, error = null, metadata = {}) {
        const record = {
            executionId,
            command: JSON.parse(JSON.stringify(command)), // 深拷贝
            status,
            timestamp: new Date().toISOString(),
            error,
            duration: metadata.duration || null,
            commandType: command?.type || 'unknown',
            version: command?.version || null,
            platform: 'miniprogram'
        }

        this.executionHistory.push(record)
        
        // 保持历史记录大小在合理范围内
        if (this.executionHistory.length > 100) {
            this.executionHistory.shift()
        }

        if (this.debugMode) {
            console.log(`[📈 ${executionId}] Execution recorded:`, record)
        }
    }

    /**
     * 获取执行历史
     */
    getExecutionHistory() {
        return this.executionHistory
    }

    /**
     * 清空执行历史
     */
    clearExecutionHistory() {
        this.executionHistory = []
    }

    /**
     * 设置调试模式
     */
    setDebugMode(enabled) {
        this.debugMode = enabled
    }

    /**
     * 获取当前支持的版本
     */
    getSupportedVersion() {
        return ROUTE_COMMAND_VERSION
    }
}

module.exports = RouterHandlerCore
import Taro from '@tarojs/taro'

/**
 * 路由指令版本常量
 */
const ROUTE_COMMAND_VERSION = 2

/**
 * 路由处理器类
 * 负责解析和执行后端发送的路由指令
 */
class RouterHandler {
    constructor(store) {
        this.store = store
        this.debugMode = process.env.NODE_ENV === 'development'
        this.executionHistory = [] // 执行历史记录
        this.fallbackStack = [] // 回退栈
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
            console.time(`Execution Time [${executionId}]`)
        }

        const startTime = performance.now()
        
        try {
            // 检查是否为版本化指令
            if (this.isVersionedCommand(routeCommand)) {
                await this.executeVersionedCommand(routeCommand, executionId)
            } else {
                // 直接执行原始指令
                await this.executeCommand(routeCommand, executionId)
            }

            const endTime = performance.now()
            const duration = endTime - startTime
            
            // 记录成功执行
            this.recordExecution(executionId, routeCommand, 'success', null, { duration })

        } catch (error) {
            const endTime = performance.now()
            const duration = endTime - startTime
            
            console.error(`❌ RouterHandler: Command execution failed [${executionId}]:`, error)
            
            // 记录失败执行
            this.recordExecution(executionId, routeCommand, 'error', error.message, { duration })
            
            // 尝试执行回退指令
            await this.handleExecutionError(routeCommand, error, executionId)

        } finally {
            if (this.debugMode) {
                console.timeEnd(`Execution Time [${executionId}]`)
                console.groupEnd()
            }
        }
    }

    /**
     * 检查是否为版本化指令
     * @param {Object} command - 指令对象
     * @returns {boolean}
     */
    isVersionedCommand(command) {
        return command.hasOwnProperty('version') && command.hasOwnProperty('command')
    }

    /**
     * 执行版本化指令
     * @param {Object} versionedCommand - 版本化指令
     * @param {string} executionId - 执行ID
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

        // 设置执行上下文
        if (metadata) {
            this.setExecutionContext(executionId, metadata)
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
     * @param {number} serverVersion - 服务端版本
     * @returns {boolean}
     */
    checkVersionCompatibility(serverVersion) {
        // 主版本号必须匹配
        const serverMajor = Math.floor(serverVersion / 100)
        const clientMajor = Math.floor(ROUTE_COMMAND_VERSION / 100)
        return serverMajor === clientMajor
    }

    /**
     * 执行具体指令
     * @param {Object} routeCommand - 路由指令
     * @param {string} executionId - 执行ID
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
     * @param {Object} payload - NavigateTo指令的负载数据
     * @param {string} executionId - 执行ID
     */
    async handleNavigateTo({ path, params, replace, fallback_path }, executionId) {
        try {
            let url = path
            
            // 添加查询参数
            if (params) {
                const searchParams = new URLSearchParams()
                Object.entries(params).forEach(([key, value]) => {
                    searchParams.append(key, String(value))
                })
                url += `?${searchParams.toString()}`
            }

            if (this.debugMode) {
                console.log(`[${executionId}] Navigating to: ${url} (replace: ${replace})`)
            }

            if (replace) {
                await Taro.redirectTo({ url })
            } else {
                await Taro.navigateTo({ url })
            }
        } catch (error) {
            console.error(`[${executionId}] Navigation failed:`, error)
            
            // 尝试使用回退路径
            if (fallback_path) {
                console.log(`[${executionId}] Trying fallback path: ${fallback_path}`)
                try {
                    if (replace) {
                        await Taro.redirectTo({ url: fallback_path })
                    } else {
                        await Taro.navigateTo({ url: fallback_path })
                    }
                    return // 成功执行回退路径
                } catch (fallbackError) {
                    console.error(`[${executionId}] Fallback navigation also failed:`, fallbackError)
                }
            }
            
            // 显示用户友好的错误提示
            Taro.showToast({
                title: '页面跳转失败',
                icon: 'error',
                duration: 2000
            })
            throw error
        }
    }

    /**
     * 处理显示对话框指令
     * @param {Object} payload - ShowDialog指令的负载数据
     * @param {string} executionId - 执行ID
     */
    async handleShowDialog({ dialog_type, title, content, actions }, executionId) {
        if (this.debugMode) {
            console.log(`[${executionId}] Showing dialog: ${dialog_type}`)
        }

        switch (dialog_type) {
            case 'Alert':
                await Taro.showModal({
                    title: title || '提示',
                    content: content || '',
                    showCancel: false,
                    confirmText: '确定'
                })
                break

            case 'Confirm':
                if (actions && actions.length > 0) {
                    const result = await Taro.showModal({
                        title: title || '确认',
                        content: content || '',
                        cancelText: actions[0]?.text || '取消',
                        confirmText: actions[1]?.text || '确定'
                    })

                    if (result.confirm && actions[1]?.action) {
                        await this.execute(actions[1].action)
                    } else if (result.cancel && actions[0]?.action) {
                        await this.execute(actions[0].action)
                    }
                } else {
                    await Taro.showModal({
                        title: title || '确认',
                        content: content || '',
                        showCancel: false
                    })
                }
                break

            case 'Toast':
                Taro.showToast({
                    title: content || title || '提示',
                    icon: 'none',
                    duration: 2000
                })
                break

            default:
                console.warn(`[${executionId}] Unknown dialog type: ${dialog_type}`)
        }
    }

    /**
     * 处理数据处理指令
     * @param {Object} payload - ProcessData指令的负载数据
     * @param {string} executionId - 执行ID
     */
    async handleProcessData({ data_type, data, merge }, executionId) {
        if (this.debugMode) {
            console.log(`[${executionId}] Processing data: ${data_type}`)
            console.log('Data:', data)
        }

        if (!this.store) {
            console.warn(`[${executionId}] No store provided for data processing`)
            return
        }

        switch (data_type) {
            case 'user':
                if (data === null || data === undefined) {
                    // 清除用户数据
                    this.store.clearUser?.()
                } else if (merge) {
                    this.store.updateUser?.(data)
                } else {
                    this.store.setUser?.(data)
                }
                break
            
            case 'userList':
                this.store.setUserList?.(data)
                break
            
            case 'settings':
                if (merge) {
                    this.store.updateSettings?.(data)
                } else {
                    this.store.setSettings?.(data)
                }
                break
            
            case 'cache':
                // 处理缓存相关数据
                if (this.store.updateCache) {
                    this.store.updateCache(data)
                }
                break
            
            default:
                console.warn(`[${executionId}] Unknown data type: ${data_type}`)
                // 通用处理：尝试调用对应的setter方法
                const setterName = `set${data_type.charAt(0).toUpperCase() + data_type.slice(1)}`
                if (typeof this.store[setterName] === 'function') {
                    this.store[setterName](data)
                }
        }
    }

    /**
     * 处理序列指令
     * @param {Object} payload - Sequence指令的负载数据
     * @param {string} executionId - 执行ID
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
            
            // 可以在这里添加延迟，如果需要的话
            // await new Promise(resolve => setTimeout(resolve, 100))
        }
    }

    /**
     * 处理条件指令
     * @param {Object} payload - Conditional指令的负载数据
     * @param {string} executionId - 执行ID
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
     * @param {Object} payload - Delay指令的负载数据  
     * @param {string} executionId - 执行ID
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
     * @param {Object} payload - Parallel指令的负载数据
     * @param {string} executionId - 执行ID  
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
     * @param {Object} payload - Retry指令的负载数据
     * @param {string} executionId - 执行ID
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
     * @param {string} condition - 条件表达式
     * @returns {boolean} 条件结果
     */
    evaluateCondition(condition) {
        // 简单的条件评估实现
        // 在生产环境中，应该使用更安全的表达式解析器
        try {
            // 提供一些基本的上下文变量
            const context = {
                user: this.store?.user || null,
                store: this.store || {},
                // 添加一些实用的helper函数
                isEmpty: (value) => !value || value.length === 0,
                isAdmin: () => this.store?.user?.is_admin || false,
                isLoggedIn: () => !!this.store?.user,
            }

            // 构造安全的评估函数
            const func = new Function(...Object.keys(context), `return ${condition}`)
            return func(...Object.values(context))
        } catch (error) {
            console.error('RouterHandler: Condition evaluation failed:', error)
            return false
        }
    }

    /**
     * 处理执行错误
     * @param {Object} originalCommand - 原始指令
     * @param {Error} error - 错误对象
     * @param {string} executionId - 执行ID
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
                this.showGenericError()
            }
        } else {
            this.showGenericError()
        }
    }

    /**
     * 显示通用错误提示
     */
    showGenericError() {
        Taro.showToast({
            title: '操作失败，请重试',
            icon: 'error',
            duration: 2000
        })
    }

    /**
     * 生成执行ID
     * @returns {string}
     */
    generateExecutionId() {
        return Math.random().toString(36).substr(2, 9)
    }

    /**
     * 设置执行上下文
     * @param {string} executionId - 执行ID
     * @param {Object} metadata - 元数据
     */
    setExecutionContext(executionId, metadata) {
        if (metadata.timeout_ms) {
            // 设置超时
            setTimeout(() => {
                console.warn(`[${executionId}] Command execution timeout after ${metadata.timeout_ms}ms`)
            }, metadata.timeout_ms)
        }
    }

    /**
     * 清理指定执行的回退栈
     * @param {string} executionId - 执行ID
     */
    clearFallbackForExecution(executionId) {
        this.fallbackStack = this.fallbackStack.filter(entry => entry.executionId !== executionId)
    }

    /**
     * 记录执行历史
     * @param {string} executionId - 执行ID
     * @param {Object} command - 指令
     * @param {string} status - 状态
     * @param {string} error - 错误信息
     * @param {Object} metadata - 执行元数据
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
            userAgent: navigator.userAgent,
            url: window.location?.href || 'unknown'
        }

        this.executionHistory.push(record)
        
        // 保持历史记录大小在合理范围内
        if (this.executionHistory.length > 100) {
            this.executionHistory.shift()
        }

        // 发送执行指标到后端（在生产环境中）
        if (process.env.NODE_ENV === 'production' && status === 'error') {
            this.reportExecutionMetrics(record)
        }

        if (this.debugMode) {
            console.log(`[📈 ${executionId}] Execution recorded:`, record)
        }
    }

    /**
     * 获取执行历史
     * @returns {Array}
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
     * 获取执行统计信息
     * @returns {Object} 执行统计
     */
    getExecutionStats() {
        const total = this.executionHistory.length
        const successful = this.executionHistory.filter(r => r.status === 'success').length
        const failed = this.executionHistory.filter(r => r.status === 'error').length
        
        const durations = this.executionHistory
            .filter(r => r.duration !== null)
            .map(r => r.duration)
        
        const avgDuration = durations.length > 0 
            ? durations.reduce((a, b) => a + b, 0) / durations.length 
            : 0
            
        const maxDuration = durations.length > 0 ? Math.max(...durations) : 0
        
        const commandTypes = {}
        this.executionHistory.forEach(record => {
            const type = record.commandType || 'unknown'
            commandTypes[type] = (commandTypes[type] || 0) + 1
        })
        
        return {
            total,
            successful,
            failed,
            successRate: total > 0 ? (successful / total * 100).toFixed(2) + '%' : '0%',
            avgDuration: Math.round(avgDuration * 100) / 100,
            maxDuration: Math.round(maxDuration * 100) / 100,
            commandTypes,
            lastExecution: this.executionHistory.length > 0 
                ? this.executionHistory[this.executionHistory.length - 1].timestamp 
                : null
        }
    }

    /**
     * 上报执行指标到后端
     * @param {Object} record - 执行记录
     */
    async reportExecutionMetrics(record) {
        try {
            // 在生产环境中可以将错误指标发送到监控系统
            if (typeof fetch !== 'undefined') {
                await fetch('/api/metrics/route-command-error', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        executionId: record.executionId,
                        commandType: record.commandType,
                        error: record.error,
                        duration: record.duration,
                        timestamp: record.timestamp,
                        userAgent: record.userAgent,
                        url: record.url
                    })
                }).catch(error => {
                    console.warn('无法上报错误指标:', error)
                })
            }
        } catch (error) {
            console.warn('指标上报失败:', error)
        }
    }

    /**
     * 设置调试模式
     * @param {boolean} enabled - 是否启用调试模式
     */
    setDebugMode(enabled) {
        this.debugMode = enabled
    }

    /**
     * 更新store引用
     * @param {Object} store - 新的store对象
     */
    updateStore(store) {
        this.store = store
    }

    /**
     * 获取当前支持的版本
     * @returns {number}
     */
    getSupportedVersion() {
        return ROUTE_COMMAND_VERSION
    }
}

export default RouterHandler
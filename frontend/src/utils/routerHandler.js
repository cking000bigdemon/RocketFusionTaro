import Taro from '@tarojs/taro'

/**
 * 路由处理器类
 * 负责解析和执行后端发送的路由指令
 */
class RouterHandler {
    constructor(store) {
        this.store = store
        this.debugMode = process.env.NODE_ENV === 'development'
    }

    /**
     * 执行路由指令
     * @param {Object} routeCommand - 路由指令对象
     */
    async execute(routeCommand) {
        if (!routeCommand) {
            console.warn('RouterHandler: No route command to execute')
            return
        }

        if (this.debugMode) {
            console.group('RouterHandler: Executing Command')
            console.log('Type:', routeCommand.type)
            console.time('Execution Time')
        }

        try {
            await this.executeInternal(routeCommand)
        } catch (error) {
            console.error('RouterHandler: Route command execution failed:', error)
            Taro.showToast({
                title: '操作失败，请重试',
                icon: 'error',
                duration: 2000
            })
        } finally {
            if (this.debugMode) {
                console.timeEnd('Execution Time')
                console.groupEnd()
            }
        }
    }

    /**
     * 内部执行路由指令的方法
     * @param {Object} routeCommand - 路由指令对象
     */
    async executeInternal(routeCommand) {
        switch (routeCommand.type) {
            case 'NavigateTo':
                return this.handleNavigateTo(routeCommand.payload)
            
            case 'ShowDialog':
                return this.handleShowDialog(routeCommand.payload)
            
            case 'ProcessData':
                return this.handleProcessData(routeCommand.payload)
            
            case 'Sequence':
                return this.handleSequence(routeCommand.payload)
            
            case 'RequestPayment':
                return this.handleRequestPayment(routeCommand.payload)
            
            case 'Conditional':
                return this.handleConditional(routeCommand.payload)
            
            default:
                console.warn('RouterHandler: Unknown route command type:', routeCommand.type)
        }
    }

    /**
     * 处理页面导航指令
     * @param {Object} payload - NavigateTo指令的负载数据
     */
    async handleNavigateTo({ path, params, replace }) {
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
                if (this.debugMode) console.log(`Navigating to: ${url}`)
            }

            if (replace) {
                await Taro.redirectTo({ url })
            } else {
                await Taro.navigateTo({ url })
            }
        } catch (error) {
            console.error('RouterHandler: Navigation failed:', error)
            Taro.showToast({
                title: '页面跳转失败',
                icon: 'error',
                duration: 2000
            })
        }
    }

    /**
     * 处理显示对话框指令
     * @param {Object} payload - ShowDialog指令的负载数据
     */
    async handleShowDialog({ dialog_type, title, content, actions }) {
        if (this.debugMode) {
            if (this.debugMode) console.log(`Showing dialog: ${dialog_type}`)
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
                console.warn('RouterHandler: Unknown dialog type:', dialog_type)
        }
    }

    /**
     * 处理数据处理指令
     * @param {Object} payload - ProcessData指令的负载数据
     */
    async handleProcessData({ data_type, data, merge }) {
        if (this.debugMode) {
            if (this.debugMode) console.log(`Processing data: ${data_type}`)
            console.log('Data:', data)
        }

        if (!this.store) {
            console.warn('RouterHandler: No store provided for data processing')
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
                console.warn('RouterHandler: Unknown data type:', data_type)
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
     */
    async handleSequence({ commands }) {
        if (this.debugMode) {
            if (this.debugMode) console.log(`Executing ${commands.length} commands`)
        }
        
        for (const command of commands) {
            await this.execute(command)
            // 可以在这里添加延迟，如果需要的话
            // await new Promise(resolve => setTimeout(resolve, 100))
        }
    }

    /**
     * 处理支付请求指令
     * @param {Object} payload - RequestPayment指令的负载数据
     */
    async handleRequestPayment({ payment_info, callback_url }) {
        if (this.debugMode) {
            if (this.debugMode) console.log('Processing payment request')
        }

        try {
            switch (payment_info.payment_method) {
                case 'wechat':
                    await this.handleWechatPay(payment_info, callback_url)
                    break
                case 'alipay':
                    await this.handleAlipay(payment_info, callback_url)
                    break
                case 'card':
                    await this.handleCardPay(payment_info, callback_url)
                    break
                default:
                    console.error('RouterHandler: Unsupported payment method:', payment_info.payment_method)
                    Taro.showToast({
                        title: '不支持的支付方式',
                        icon: 'error'
                    })
            }
        } catch (error) {
            console.error('RouterHandler: Payment failed:', error)
            Taro.showToast({
                title: '支付失败',
                icon: 'error'
            })
        }
    }

    /**
     * 处理微信支付
     * @param {Object} paymentInfo - 支付信息
     * @param {string} callbackUrl - 回调URL
     */
    async handleWechatPay(paymentInfo, callbackUrl) {
        // TODO: 实现微信支付逻辑
        // WeChat Pay not implemented
        Taro.showModal({
            title: '支付功能',
            content: '微信支付功能尚未实现',
            showCancel: false
        })
    }

    /**
     * 处理支付宝支付
     * @param {Object} paymentInfo - 支付信息
     * @param {string} callbackUrl - 回调URL
     */
    async handleAlipay(paymentInfo, callbackUrl) {
        // TODO: 实现支付宝支付逻辑
        // Alipay not implemented
        Taro.showModal({
            title: '支付功能',
            content: '支付宝支付功能尚未实现',
            showCancel: false
        })
    }

    /**
     * 处理信用卡支付
     * @param {Object} paymentInfo - 支付信息
     * @param {string} callbackUrl - 回调URL
     */
    async handleCardPay(paymentInfo, callbackUrl) {
        // TODO: 实现信用卡支付逻辑
        // Card payment not implemented
        Taro.showModal({
            title: '支付功能',
            content: '信用卡支付功能尚未实现',
            showCancel: false
        })
    }

    /**
     * 处理条件指令
     * @param {Object} payload - Conditional指令的负载数据
     */
    async handleConditional({ condition, if_true, if_false }) {
        if (this.debugMode) {
            if (this.debugMode) console.log(`Evaluating condition: ${condition}`)
        }

        try {
            const conditionResult = this.evaluateCondition(condition)
            
            if (conditionResult && if_true) {
                await this.execute(if_true)
            } else if (!conditionResult && if_false) {
                await this.execute(if_false)
            }
        } catch (error) {
            console.error('RouterHandler: Conditional execution failed:', error)
        }
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
}

export default RouterHandler
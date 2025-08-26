/**
 * 共享工具函数库
 * 提供各平台通用的工具方法
 */

// ========================
// 字符串工具
// ========================

/**
 * 首字母大写
 * @param {string} str 
 * @returns {string}
 */
export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * 驼峰命名转换
 * @param {string} str 
 * @returns {string}
 */
export function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())
}

/**
 * 短横线命名转换
 * @param {string} str 
 * @returns {string}
 */
export function toKebabCase(str) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
}

/**
 * 生成随机字符串
 * @param {number} length 
 * @returns {string}
 */
export function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// ========================
// 对象工具
// ========================

/**
 * 深克隆对象
 * @param {any} obj 
 * @returns {any}
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj)
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  
  if (typeof obj === 'object') {
    const cloned = {}
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key])
    })
    return cloned
  }
}

/**
 * 深度合并对象
 * @param {object} target 
 * @param {...object} sources 
 * @returns {object}
 */
export function deepMerge(target, ...sources) {
  if (!sources.length) return target
  const source = sources.shift()

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} })
        deepMerge(target[key], source[key])
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    }
  }

  return deepMerge(target, ...sources)
}

/**
 * 检查是否为对象
 * @param {any} item 
 * @returns {boolean}
 */
export function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item)
}

/**
 * 获取对象嵌套属性值
 * @param {object} obj 
 * @param {string} path 
 * @param {any} defaultValue 
 * @returns {any}
 */
export function get(obj, path, defaultValue = undefined) {
  const keys = path.split('.')
  let result = obj
  
  for (const key of keys) {
    result = result?.[key]
    if (result === undefined) return defaultValue
  }
  
  return result
}

/**
 * 设置对象嵌套属性值
 * @param {object} obj 
 * @param {string} path 
 * @param {any} value 
 */
export function set(obj, path, value) {
  const keys = path.split('.')
  const lastKey = keys.pop()
  let current = obj
  
  for (const key of keys) {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }
  
  current[lastKey] = value
}

// ========================
// 数组工具
// ========================

/**
 * 数组去重
 * @param {array} arr 
 * @param {string} key - 对象数组去重的键
 * @returns {array}
 */
export function unique(arr, key = null) {
  if (!key) {
    return [...new Set(arr)]
  }
  
  const seen = new Set()
  return arr.filter(item => {
    const keyValue = item[key]
    if (seen.has(keyValue)) {
      return false
    }
    seen.add(keyValue)
    return true
  })
}

/**
 * 数组分组
 * @param {array} arr 
 * @param {string|function} keyOrFn 
 * @returns {object}
 */
export function groupBy(arr, keyOrFn) {
  const getKey = typeof keyOrFn === 'function' ? keyOrFn : item => item[keyOrFn]
  
  return arr.reduce((groups, item) => {
    const key = getKey(item)
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
    return groups
  }, {})
}

/**
 * 数组分页
 * @param {array} arr 
 * @param {number} page 
 * @param {number} pageSize 
 * @returns {array}
 */
export function paginate(arr, page = 1, pageSize = 10) {
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  return arr.slice(startIndex, endIndex)
}

// ========================
// 日期时间工具
// ========================

/**
 * 格式化日期
 * @param {Date|string|number} date 
 * @param {string} format 
 * @returns {string}
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 相对时间
 * @param {Date|string|number} date 
 * @returns {string}
 */
export function timeAgo(date) {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now - past
  
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffSeconds < 60) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 30) return `${diffDays}天前`
  
  return formatDate(date, 'YYYY-MM-DD')
}

// ========================
// URL和查询参数工具
// ========================

/**
 * 解析URL查询参数
 * @param {string} url 
 * @returns {object}
 */
export function parseQuery(url = window.location.href) {
  const queryString = url.split('?')[1]
  if (!queryString) return {}
  
  const params = {}
  queryString.split('&').forEach(param => {
    const [key, value] = param.split('=')
    params[decodeURIComponent(key)] = decodeURIComponent(value || '')
  })
  
  return params
}

/**
 * 构建查询参数字符串
 * @param {object} params 
 * @returns {string}
 */
export function buildQuery(params) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.append(key, String(value))
    }
  })
  return searchParams.toString()
}

/**
 * 合并URL和查询参数
 * @param {string} url 
 * @param {object} params 
 * @returns {string}
 */
export function buildURL(url, params = {}) {
  if (Object.keys(params).length === 0) return url
  
  const separator = url.includes('?') ? '&' : '?'
  return url + separator + buildQuery(params)
}

// ========================
// 验证工具
// ========================

/**
 * 验证邮箱格式
 * @param {string} email 
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 验证手机号格式
 * @param {string} phone 
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

/**
 * 验证用户名格式
 * @param {string} username 
 * @returns {boolean}
 */
export function isValidUsername(username) {
  // 4-20位，字母开头，可包含字母、数字、下划线
  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{3,19}$/
  return usernameRegex.test(username)
}

/**
 * 验证密码强度
 * @param {string} password 
 * @returns {object}
 */
export function checkPasswordStrength(password) {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  }
  
  const passed = Object.values(checks).filter(Boolean).length
  
  let strength = 'weak'
  if (passed >= 4) strength = 'strong'
  else if (passed >= 3) strength = 'medium'
  
  return { checks, strength, score: passed }
}

// ========================
// 防抖和节流
// ========================

/**
 * 防抖函数
 * @param {function} func 
 * @param {number} delay 
 * @returns {function}
 */
export function debounce(func, delay) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

/**
 * 节流函数
 * @param {function} func 
 * @param {number} delay 
 * @returns {function}
 */
export function throttle(func, delay) {
  let lastCall = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      func.apply(this, args)
    }
  }
}

// ========================
// 本地存储工具
// ========================

/**
 * 安全的localStorage操作
 */
export const storage = {
  get(key) {
    try {
      const value = localStorage.getItem(key)
      return value ? JSON.parse(value) : null
    } catch {
      return null
    }
  },
  
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },
  
  remove(key) {
    try {
      localStorage.removeItem(key)
      return true
    } catch {
      return false
    }
  },
  
  clear() {
    try {
      localStorage.clear()
      return true
    } catch {
      return false
    }
  }
}

// ========================
// 错误处理工具
// ========================

/**
 * 错误边界处理
 * @param {function} fn 
 * @param {any} fallback 
 * @returns {any}
 */
export function safeExecute(fn, fallback = null) {
  try {
    return fn()
  } catch (error) {
    console.error('Safe execute failed:', error)
    return fallback
  }
}

/**
 * 异步错误处理
 * @param {Promise} promise 
 * @returns {Promise<[any, Error]>}
 */
export function to(promise) {
  return promise
    .then(data => [data, null])
    .catch(error => [null, error])
}

// ========================
// 性能工具
// ========================

/**
 * 简单的性能计时器
 */
export class Timer {
  constructor() {
    this.startTime = 0
  }
  
  start() {
    this.startTime = performance.now()
  }
  
  end() {
    return performance.now() - this.startTime
  }
}

/**
 * 创建计时器
 * @param {string} name 
 * @returns {function}
 */
export function createTimer(name) {
  const timer = new Timer()
  timer.start()
  
  return () => {
    const duration = timer.end()
    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`)
    return duration
  }
}
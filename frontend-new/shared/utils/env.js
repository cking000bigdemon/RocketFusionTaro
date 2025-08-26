/**
 * 环境变量适配器
 * 统一处理不同平台的环境变量访问
 */

/**
 * 获取环境变量值
 * @param {string} key - 环境变量键名
 * @param {string} defaultValue - 默认值
 * @returns {string} 环境变量值
 */
export function getEnv(key, defaultValue = '') {
  // 浏览器环境 (Vite) - 使用try/catch安全检测
  try {
    if (typeof window !== 'undefined' && import.meta && import.meta.env) {
      return import.meta.env[key] || defaultValue
    }
  } catch (e) {
    // 如果import.meta不可用，继续下面的检测
  }
  
  // Node.js环境
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue
  }
  
  // 微信小程序环境的特殊处理
  if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
    // 微信小程序环境，返回默认值
    return defaultValue
  }
  
  return defaultValue
}

/**
 * 判断是否为开发环境
 * @returns {boolean}
 */
export function isDevelopment() {
  return getEnv('NODE_ENV', 'development') === 'development' ||
         getEnv('MODE', 'development') === 'development'
}

/**
 * 判断是否为生产环境
 * @returns {boolean}
 */
export function isProduction() {
  return getEnv('NODE_ENV', 'development') === 'production' ||
         getEnv('MODE', 'development') === 'production'
}
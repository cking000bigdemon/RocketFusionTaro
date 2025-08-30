/**
 * 微信小程序配置管理
 * 统一管理所有可配置项，便于维护和环境切换
 */

module.exports = {
  // API配置
  api: {
    development: 'http://192.168.3.32:8000',
    production: 'https://your-api-domain.com'
  },
  
  // AI知识库配置
  aiKnowledge: {
    webviewUrl: 'https://halo.lxc.cksiyouyun.icu:8088'
  },
  
  // 应用配置
  app: {
    name: 'Rocket Mini Program',
    version: '1.0.0'
  },
  
  // 其他功能配置
  features: {
    enableDebugMode: true,
    enableRouterLog: true,
    sessionExpireDays: 7
  }
}
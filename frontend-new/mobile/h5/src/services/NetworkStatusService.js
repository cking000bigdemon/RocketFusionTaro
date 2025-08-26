/**
 * 网络状态检测服务
 * 提供多层级网络连接状态检测
 */
import apiClient from '@shared/api/ApiClient.js';

class NetworkStatusService {
  constructor() {
    this.listeners = new Set();
    this.status = {
      // 浏览器原生状态
      browser: {
        online: navigator.onLine,
        type: 'unknown',
        downlink: null,
        rtt: null
      },
      // 后端服务状态
      backend: {
        connected: false,
        status: 'unknown',
        responseTime: null,
        lastCheck: null,
        error: null
      },
      // 系统组件状态
      system: {
        server: null,
        database: null,
        cache: null,
        overall: 'unknown'
      }
    };
    
    this.checkInterval = null;
    this.isChecking = false;
    
    this.initNetworkMonitoring();
  }

  /**
   * 初始化网络状态监听
   */
  initNetworkMonitoring() {
    // 监听浏览器原生网络状态变化
    const updateBrowserStatus = () => {
      const wasOnline = this.status.browser.online;
      this.status.browser.online = navigator.onLine;
      
      // 更新连接信息
      if (navigator.connection) {
        this.status.browser.type = navigator.connection.effectiveType || 'unknown';
        this.status.browser.downlink = navigator.connection.downlink || null;
        this.status.browser.rtt = navigator.connection.rtt || null;
      }
      
      // 如果网络状态发生变化，立即检测后端连接
      if (wasOnline !== this.status.browser.online) {
        if (this.status.browser.online) {
          // 网络恢复，延迟检测后端状态
          setTimeout(() => this.checkBackendStatus(), 1000);
        } else {
          // 网络断开，立即更新后端状态
          this.updateBackendStatus(false, null, 'Network offline');
        }
      }
      
      this.notifyListeners();
    };

    window.addEventListener('online', updateBrowserStatus);
    window.addEventListener('offline', updateBrowserStatus);

    // 监听连接类型变化
    if (navigator.connection) {
      navigator.connection.addEventListener('change', updateBrowserStatus);
      updateBrowserStatus(); // 初始化
    }
  }

  /**
   * 添加状态变化监听器
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听函数
   */
  addListener(callback) {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * 通知所有监听器
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.status);
      } catch (error) {
        console.error('NetworkStatusService: Listener error:', error);
      }
    });
  }

  /**
   * 检测后端服务状态
   * @returns {Promise<boolean>}
   */
  async checkBackendStatus() {
    if (this.isChecking) {
      return this.status.backend.connected;
    }

    this.isChecking = true;
    const startTime = Date.now();

    try {
      const response = await apiClient.getHealthStatus();
      const responseTime = Date.now() - startTime;
      
      if (response && response.code === 200 && response.data) {
        this.updateBackendStatus(true, responseTime);
        this.updateSystemStatus(response.data);
        
        // 如果基础检查成功，获取详细的系统健康状态
        setTimeout(() => this.checkSystemHealth(), 100);
        return true;
      } else {
        this.updateBackendStatus(false, responseTime, 'Invalid response');
        return false;
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateBackendStatus(false, responseTime, error.message);
      return false;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * 检测系统健康状态
   * @returns {Promise<Object|null>}
   */
  async checkSystemHealth() {
    try {
      const response = await apiClient.getSystemHealthStatus();
      
      if (response && response.code === 200 && response.data) {
        this.updateSystemStatus(response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to check system health:', error);
      this.updateSystemStatus(null, error.message);
      return null;
    }
  }

  /**
   * 更新后端状态
   * @param {boolean} connected - 是否连接
   * @param {number|null} responseTime - 响应时间
   * @param {string|null} error - 错误信息
   */
  updateBackendStatus(connected, responseTime = null, error = null) {
    this.status.backend = {
      connected,
      status: connected ? 'healthy' : 'unhealthy',
      responseTime,
      lastCheck: new Date().toISOString(),
      error
    };
    
    this.notifyListeners();
  }

  /**
   * 更新系统状态
   * @param {Object|null} systemData - 系统状态数据
   * @param {string|null} error - 错误信息
   */
  updateSystemStatus(systemData, error = null) {
    if (!systemData) {
      this.status.system = {
        server: null,
        database: null,
        cache: null,
        overall: 'unknown',
        error
      };
    } else {
      this.status.system = {
        server: {
          status: systemData.server?.status || 'unknown',
          host: systemData.server?.host,
          port: systemData.server?.port,
          uptime: systemData.server?.uptime
        },
        database: {
          status: systemData.database?.status || 'unknown',
          connected: systemData.database?.connected || false,
          host: systemData.database?.host,
          port: systemData.database?.port,
          database: systemData.database?.database,
          responseTime: systemData.database?.response_time_ms,
          error: systemData.database?.error
        },
        cache: {
          status: systemData.cache?.status || 'unknown',
          connected: systemData.cache?.connected || false,
          host: systemData.cache?.host,
          port: systemData.cache?.port,
          responseTime: systemData.cache?.response_time_ms,
          error: systemData.cache?.error
        },
        overall: systemData.status || 'unknown',
        version: systemData.version,
        timestamp: systemData.timestamp,
        error: null
      };
    }
    
    this.notifyListeners();
  }

  /**
   * 开始定期检测
   * @param {number} interval - 检测间隔（毫秒），默认30秒
   */
  startPeriodicCheck(interval = 30000) {
    this.stopPeriodicCheck();
    
    // 立即执行一次检测
    this.checkBackendStatus();
    
    // 设置定期检测
    this.checkInterval = setInterval(async () => {
      if (this.status.browser.online) {
        await this.checkBackendStatus();
      }
    }, interval);
  }

  /**
   * 停止定期检测
   */
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * 手动刷新状态
   * @returns {Promise<void>}
   */
  async refresh() {
    if (!this.status.browser.online) {
      this.updateBackendStatus(false, null, 'Browser offline');
      return;
    }

    await this.checkBackendStatus();
    
    // 如果后端连接正常，检查系统健康状态
    if (this.status.backend.connected) {
      await this.checkSystemHealth();
    }
  }

  /**
   * 获取当前状态
   * @returns {Object}
   */
  getStatus() {
    return { ...this.status };
  }

  /**
   * 获取整体网络状态
   * @returns {string} 'online' | 'offline' | 'degraded'
   */
  getOverallStatus() {
    if (!this.status.browser.online) {
      return 'offline';
    }
    
    if (!this.status.backend.connected) {
      return 'degraded';
    }
    
    if (this.status.system.overall === 'critical') {
      return 'degraded';
    }
    
    return 'online';
  }

  /**
   * 获取状态描述文本
   * @returns {Object}
   */
  getStatusText() {
    const overall = this.getOverallStatus();
    
    switch (overall) {
      case 'online':
        return {
          status: '在线',
          detail: '所有服务正常运行',
          color: 'success'
        };
      case 'degraded':
        return {
          status: '服务受限',
          detail: this.status.backend.connected ? '部分服务异常' : '后端服务连接失败',
          color: 'warning'
        };
      case 'offline':
        return {
          status: '离线',
          detail: '网络连接已断开',
          color: 'danger'
        };
      default:
        return {
          status: '未知',
          detail: '状态检测中...',
          color: 'default'
        };
    }
  }

  /**
   * 销毁服务
   */
  destroy() {
    this.stopPeriodicCheck();
    this.listeners.clear();
    
    // 移除事件监听器
    window.removeEventListener('online', this.updateBrowserStatus);
    window.removeEventListener('offline', this.updateBrowserStatus);
    
    if (navigator.connection) {
      navigator.connection.removeEventListener('change', this.updateBrowserStatus);
    }
  }
}

// 单例实例
const networkStatusService = new NetworkStatusService();

export default networkStatusService;
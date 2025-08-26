/**
 * 平台适配器基类
 * 定义了所有RouterHandler需要的平台特定操作接口
 * 各个平台需要实现这个接口来适配不同的API
 */
class PlatformAdapter {
    /**
     * 页面导航
     * @param {string} url - 目标URL
     * @param {boolean} replace - 是否替换当前页面
     */
    async navigateTo(url, replace = false) {
        throw new Error('PlatformAdapter.navigateTo must be implemented')
    }

    /**
     * 显示Toast提示
     * @param {string} message - 提示信息
     * @param {string} type - 提示类型: 'success', 'error', 'info', 'none'
     * @param {number} duration - 显示时长(ms)
     */
    async showToast(message, type = 'none', duration = 2000) {
        throw new Error('PlatformAdapter.showToast must be implemented')
    }

    /**
     * 显示警告对话框
     * @param {string} title - 标题
     * @param {string} content - 内容
     */
    async showAlert(title, content) {
        throw new Error('PlatformAdapter.showAlert must be implemented')
    }

    /**
     * 显示确认对话框
     * @param {string} title - 标题
     * @param {string} content - 内容
     * @param {string} cancelText - 取消按钮文字
     * @param {string} confirmText - 确认按钮文字
     * @returns {Promise<{confirm: boolean, cancel: boolean}>}
     */
    async showConfirm(title, content, cancelText = '取消', confirmText = '确定') {
        throw new Error('PlatformAdapter.showConfirm must be implemented')
    }

    /**
     * 获取当前页面路径
     * @returns {string}
     */
    getCurrentPath() {
        throw new Error('PlatformAdapter.getCurrentPath must be implemented')
    }

    /**
     * 设置页面标题
     * @param {string} title - 页面标题
     */
    async setPageTitle(title) {
        throw new Error('PlatformAdapter.setPageTitle must be implemented')
    }

    /**
     * 获取平台信息
     * @returns {Object} 平台信息对象
     */
    getPlatformInfo() {
        throw new Error('PlatformAdapter.getPlatformInfo must be implemented')
    }
}

export default PlatformAdapter
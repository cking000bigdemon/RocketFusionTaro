/**
 * 共享的TypeScript类型定义
 * 包含前后端通信的所有数据结构
 */

// ========================
// 路由指令相关类型
// ========================

export interface RouteCommand {
  type: 'NavigateTo' | 'ShowDialog' | 'ProcessData' | 'Sequence' | 'Conditional' | 'Delay' | 'Parallel' | 'Retry'
  payload: any
}

export interface NavigateToPayload {
  path: string
  params?: Record<string, any>
  replace?: boolean
  fallback_path?: string
}

export interface ShowDialogPayload {
  dialog_type: 'Alert' | 'Confirm' | 'Toast'
  title: string
  content: string
  actions?: DialogAction[]
}

export interface DialogAction {
  text: string
  action?: RouteCommand
}

export interface ProcessDataPayload {
  data_type: string
  data: any
  merge?: boolean
}

export interface SequencePayload {
  commands: RouteCommand[]
  stop_on_error?: boolean
}

export interface ConditionalPayload {
  condition: string
  if_true?: RouteCommand
  if_false?: RouteCommand
}

export interface DelayPayload {
  duration_ms: number
  command: RouteCommand
}

export interface ParallelPayload {
  commands: RouteCommand[]
  wait_for_all?: boolean
}

export interface RetryPayload {
  command: RouteCommand
  max_attempts: number
  delay_ms: number
}

export interface VersionedRouteCommand {
  version: number
  command: RouteCommand
  fallback?: VersionedRouteCommand
  metadata?: RouteCommandMetadata
}

export interface RouteCommandMetadata {
  timeout_ms?: number
  priority?: number
  tags?: string[]
}

// ========================
// API响应类型
// ========================

export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
  route_command?: RouteCommand | VersionedRouteCommand
}

export interface AdminApiResponse<T = any> {
  code: number
  message: string
  data?: T
  // 管理端API不包含route_command
}

// ========================
// 用户相关类型
// ========================

export interface User {
  id: string
  username: string
  email?: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  username: string
  password: string
  remember_me?: boolean
}

export interface LoginResponse {
  user: User
  session_token?: string
  expires_at: string
}

export interface UserSession {
  id: string
  user_id: string
  session_token: string
  expires_at: string
  created_at: string
}

// ========================
// 用户数据相关类型
// ========================

export interface UserData {
  id: string
  user_id: string
  name: string
  description?: string
  data_type: string
  content: any
  tags?: string[]
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface UserDataCreateRequest {
  name: string
  description?: string
  data_type: string
  content: any
  tags?: string[]
  is_public?: boolean
}

export interface UserDataUpdateRequest {
  name?: string
  description?: string
  content?: any
  tags?: string[]
  is_public?: boolean
}

// ========================
// 系统相关类型
// ========================

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  checks: {
    database: boolean
    redis: boolean
    [key: string]: boolean
  }
}

export interface SystemStats {
  total_users: number
  active_sessions: number
  total_user_data: number
  system_uptime: number
  memory_usage: number
  cpu_usage: number
}

export interface ErrorReport {
  error_type: string
  message: string
  stack?: string
  user_agent: string
  url: string
  timestamp: string
  user_id?: string
}

// ========================
// 路由处理器相关类型
// ========================

export interface ExecutionRecord {
  executionId: string
  command: RouteCommand
  status: 'success' | 'error'
  timestamp: string
  error?: string
  duration?: number
  commandType: string
  version?: number
  userAgent: string
  url: string
}

export interface ExecutionStats {
  total: number
  successful: number
  failed: number
  successRate: string
  avgDuration: number
  maxDuration: number
  commandTypes: Record<string, number>
  lastExecution?: string
}

export interface PlatformInfo {
  platform: 'h5' | 'weapp' | 'admin'
  version: string
  userAgent?: string
  screenSize?: {
    width: number
    height: number
  }
}

// ========================
// Store状态类型
// ========================

export interface AppState {
  user?: User
  userList?: User[]
  settings?: AppSettings
  cache?: Record<string, any>
  isLoading: boolean
}

export interface AppSettings {
  theme: 'light' | 'dark'
  language: 'zh-CN' | 'en-US'
  notifications: boolean
  autoLogin: boolean
}

// ========================
// 组件Props类型
// ========================

export interface BaseComponentProps {
  className?: string
  style?: React.CSSProperties
}

export interface LoadingProps extends BaseComponentProps {
  loading: boolean
  text?: string
  size?: 'small' | 'medium' | 'large'
}

export interface DialogProps extends BaseComponentProps {
  visible: boolean
  title: string
  content: string
  onConfirm?: () => void
  onCancel?: () => void
}

// ========================
// 平台适配器类型
// ========================

export interface NavigationOptions {
  replace?: boolean
  animate?: boolean
}

export interface ToastOptions {
  duration?: number
  position?: 'top' | 'center' | 'bottom'
  mask?: boolean
}

export interface ConfirmResult {
  confirm: boolean
  cancel: boolean
}

// ========================
// 工具函数类型
// ========================

export type EventListener<T = any> = (data: T) => void

export interface EventEmitter {
  on<T>(event: string, listener: EventListener<T>): void
  off<T>(event: string, listener: EventListener<T>): void
  emit<T>(event: string, data?: T): void
}

export interface CacheOptions {
  ttl?: number // 生存时间(秒)
  refresh?: boolean // 是否刷新
}

export interface Storage {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
}

// ========================
// 构建配置类型
// ========================

export interface BuildConfig {
  mode: 'development' | 'production'
  platform: 'h5' | 'weapp' | 'admin'
  apiBaseUrl: string
  enableMock: boolean
  enableSourceMap: boolean
}

export interface ProjectConfig {
  appId: string // 小程序appId
  appName: string
  version: string
  build: BuildConfig
}
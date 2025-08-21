-- 用户认证系统数据库初始化脚本
-- 项目: Rocket + Taro 全栈应用 - 用户登录功能
-- 创建时间: 2025-08-21

-- 创建用户账户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE CONSTRAINT username_not_empty CHECK (length(trim(username)) >= 3),
    email VARCHAR(255) NOT NULL UNIQUE CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    avatar_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户登录日志表
CREATE TABLE IF NOT EXISTS login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(50),
    login_success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    failure_reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at);

-- 创建自动更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为users表创建更新时间戳触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建清理过期会话的函数
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ language 'plpgsql';

-- 添加表注释
COMMENT ON TABLE users IS '用户账户表';
COMMENT ON COLUMN users.id IS '用户唯一标识符';
COMMENT ON COLUMN users.username IS '用户名（3-50字符，唯一）';
COMMENT ON COLUMN users.email IS '用户邮箱（唯一）';
COMMENT ON COLUMN users.password_hash IS '密码哈希值（bcrypt）';
COMMENT ON COLUMN users.full_name IS '用户真实姓名';
COMMENT ON COLUMN users.avatar_url IS '用户头像URL';
COMMENT ON COLUMN users.is_active IS '账户是否激活';
COMMENT ON COLUMN users.is_admin IS '是否为管理员';
COMMENT ON COLUMN users.last_login_at IS '最后登录时间';

COMMENT ON TABLE user_sessions IS '用户会话表';
COMMENT ON COLUMN user_sessions.session_token IS '会话令牌';
COMMENT ON COLUMN user_sessions.user_agent IS '用户代理字符串';
COMMENT ON COLUMN user_sessions.ip_address IS 'IP地址';
COMMENT ON COLUMN user_sessions.expires_at IS '会话过期时间';

COMMENT ON TABLE login_logs IS '登录日志表';
COMMENT ON COLUMN login_logs.login_success IS '登录是否成功';
COMMENT ON COLUMN login_logs.failure_reason IS '登录失败原因';

-- 创建默认管理员账户（密码: admin123）
-- 注意：这个密码哈希是 'admin123' 的 bcrypt 哈希值
INSERT INTO users (username, email, password_hash, full_name, is_admin, is_active) 
VALUES (
    'admin',
    'admin@rocket-taro.com',
    '$2a$10$Tz0HqGNzgv8fQXTqGDKSUu.kzPQ3jLZ6dKS8tJHb7jGV.yfWmZo3e',
    '系统管理员',
    true,
    true
) ON CONFLICT (username) DO NOTHING;

-- 创建测试用户账户（密码: test123）
INSERT INTO users (username, email, password_hash, full_name, is_admin, is_active)
VALUES (
    'test',
    'test@rocket-taro.com',
    '$2a$10$EGP8UUdpXYwJrGf.VRkzTu3Tz5QK8YpY4LG9OJcgL.dKqQzWmFJO2',
    '测试用户',
    false,
    true
) ON CONFLICT (username) DO NOTHING;

-- 显示创建结果
SELECT 'Auth tables created successfully' AS status;
SELECT 'Default users:' AS info;
SELECT username, email, full_name, is_admin, created_at FROM users;
-- PostgreSQL 数据库初始化脚本
-- 项目: Rocket + Taro 全栈应用
-- 创建时间: 2025-08-21

-- 创建用户数据表
CREATE TABLE IF NOT EXISTS user_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0),
    email VARCHAR(255) NOT NULL CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    phone VARCHAR(20) CONSTRAINT phone_format CHECK (phone IS NULL OR phone ~* '^\+?[0-9\s\-\(\)]{10,20}$'),
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_data_email ON user_data(email);
CREATE INDEX IF NOT EXISTS idx_user_data_created_at ON user_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_data_name ON user_data(name);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
DROP TRIGGER IF EXISTS update_user_data_updated_at ON user_data;
CREATE TRIGGER update_user_data_updated_at
    BEFORE UPDATE ON user_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 添加表注释
COMMENT ON TABLE user_data IS 'Rocket + Taro 项目用户数据表';
COMMENT ON COLUMN user_data.id IS '用户数据唯一标识符';
COMMENT ON COLUMN user_data.name IS '用户姓名';
COMMENT ON COLUMN user_data.email IS '用户邮箱地址';
COMMENT ON COLUMN user_data.phone IS '用户手机号码（可选）';
COMMENT ON COLUMN user_data.message IS '用户备注信息（可选）';
COMMENT ON COLUMN user_data.created_at IS '记录创建时间';
COMMENT ON COLUMN user_data.updated_at IS '记录更新时间';

-- 显示创建结果
SELECT 'user_data 表创建完成' AS status;
\d user_data
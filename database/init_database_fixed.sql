-- PostgreSQL 数据库初始化脚本（修复版）
-- 项目: Rocket + Taro 全栈应用
-- 创建时间: 2025-08-21

-- 删除已存在的表（如果需要重新创建）
-- DROP TABLE IF EXISTS user_data;

-- 创建用户数据表（与 Rust 代码完全匹配）
CREATE TABLE IF NOT EXISTS user_data (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

-- 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_data_email ON user_data(email);
CREATE INDEX IF NOT EXISTS idx_user_data_created_at ON user_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_data_name ON user_data(name);

-- 添加表注释
COMMENT ON TABLE user_data IS 'Rocket + Taro 项目用户数据表';
COMMENT ON COLUMN user_data.id IS '用户数据唯一标识符';
COMMENT ON COLUMN user_data.name IS '用户姓名';
COMMENT ON COLUMN user_data.email IS '用户邮箱地址';
COMMENT ON COLUMN user_data.phone IS '用户手机号码（可选）';
COMMENT ON COLUMN user_data.message IS '用户备注信息（可选）';
COMMENT ON COLUMN user_data.created_at IS '记录创建时间';

-- 插入测试数据验证表结构
INSERT INTO user_data (id, name, email, phone, message, created_at) VALUES 
(gen_random_uuid(), '测试用户1', 'test1@example.com', '13800138001', '这是第一条测试数据', CURRENT_TIMESTAMP),
(gen_random_uuid(), '测试用户2', 'test2@example.com', '13800138002', '这是第二条测试数据', CURRENT_TIMESTAMP),
(gen_random_uuid(), '测试用户3', 'test3@example.com', NULL, '这是没有电话的测试数据', CURRENT_TIMESTAMP);

-- 验证数据插入
SELECT 'user_data 表创建完成，已插入' || COUNT(*) || '条测试数据' AS status FROM user_data;

-- 显示表结构
\d user_data

-- 显示数据
SELECT * FROM user_data ORDER BY created_at DESC;
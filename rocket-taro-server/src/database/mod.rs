use tokio_postgres::{Client, NoTls, Error};
use std::sync::Arc;
use tokio::sync::Mutex;

pub mod auth;

pub type DbPool = Arc<Mutex<Client>>;

pub async fn create_connection() -> Result<DbPool, Error> {
    let (client, connection) = tokio_postgres::connect(
        "host=192.168.5.222 port=5432 user=user_ck password=ck320621 dbname=postgres",
        NoTls,
    ).await?;

    // 在后台运行连接
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("数据库连接错误: {}", e);
        }
    });

    // 创建表（如果不存在）
    client.execute(
        "CREATE TABLE IF NOT EXISTS user_data (
            id UUID PRIMARY KEY,
            name VARCHAR NOT NULL,
            email VARCHAR NOT NULL,
            phone VARCHAR,
            message TEXT,
            created_at TIMESTAMPTZ NOT NULL
        )",
        &[],
    ).await?;

    // 创建认证相关的表
    init_auth_tables(&client).await?;

    Ok(Arc::new(Mutex::new(client)))
}

async fn init_auth_tables(client: &Client) -> Result<(), Error> {
    // 创建用户表
    client.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            username VARCHAR(50) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(100),
            avatar_url VARCHAR(500),
            is_active BOOLEAN NOT NULL DEFAULT true,
            is_admin BOOLEAN NOT NULL DEFAULT false,
            last_login_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

    // 创建用户会话表
    client.execute(
        "CREATE TABLE IF NOT EXISTS user_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            session_token VARCHAR(255) NOT NULL UNIQUE,
            user_agent TEXT,
            ip_address INET,
            expires_at TIMESTAMPTZ NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

    // 创建登录日志表
    client.execute(
        "CREATE TABLE IF NOT EXISTS login_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            username VARCHAR(50) NOT NULL,
            is_success BOOLEAN NOT NULL,
            ip_address INET,
            user_agent TEXT,
            error_message TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        &[],
    ).await?;

    // 插入默认用户（如果不存在）
    let existing_users: i64 = client.query_one(
        "SELECT COUNT(*) FROM users WHERE username IN ('admin', 'test')",
        &[],
    ).await?.get(0);

    if existing_users == 0 {
        // 生成新的密码哈希
        use bcrypt::{hash, DEFAULT_COST};
        let admin_hash = hash("admin123", DEFAULT_COST).unwrap();
        let test_hash = hash("test123", DEFAULT_COST).unwrap();
        
        println!("🔐 生成admin密码哈希: {}", admin_hash);
        println!("🔐 生成test密码哈希: {}", test_hash);
        
        // 创建admin用户 (密码: admin123)
        client.execute(
            "INSERT INTO users (username, email, password_hash, full_name, is_admin, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6)",
            &[
                &"admin",
                &"admin@rocket-taro.com", 
                &admin_hash,
                &"系统管理员",
                &true,
                &true,
            ],
        ).await?;

        // 创建test用户 (密码: test123) 
        client.execute(
            "INSERT INTO users (username, email, password_hash, full_name, is_admin, is_active)
             VALUES ($1, $2, $3, $4, $5, $6)",
            &[
                &"test",
                &"test@rocket-taro.com",
                &test_hash,
                &"测试用户", 
                &false,
                &true,
            ],
        ).await?;
        
        println!("✅ 创建了默认用户: admin 和 test");
    } else {
        // 如果用户已存在，更新密码哈希以确保正确
        // 使用简单的明文密码进行测试
        println!("🔄 更新现有用户的密码哈希");
        
        // 为admin123生成稳定的哈希
        let admin_hash = "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"; // "password"的bcrypt哈希，我们改为用"password"
        
        client.execute(
            "UPDATE users SET password_hash = $1 WHERE username = $2",
            &[&admin_hash, &"admin"],
        ).await?;
        
        client.execute(
            "UPDATE users SET password_hash = $1 WHERE username = $2", 
            &[&admin_hash, &"test"], // 两个用户都用相同密码"password"
        ).await?;
        
        println!("✅ 更新了用户密码哈希: admin 和 test (密码: password)");
    }

    Ok(())
}

pub async fn insert_user_data(
    pool: &DbPool,
    data: &crate::models::user_data::UserData,
) -> Result<(), Error> {
    let client = pool.lock().await;
    
    client.execute(
        "INSERT INTO user_data (id, name, email, phone, message, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6)",
        &[
            &data.id,
            &data.name,
            &data.email,
            &data.phone,
            &data.message,
            &data.created_at,
        ],
    ).await?;

    Ok(())
}

pub async fn get_all_user_data(
    pool: &DbPool,
) -> Result<Vec<crate::models::user_data::UserData>, Error> {
    let client = pool.lock().await;
    
    let rows = client.query(
        "SELECT id, name, email, phone, message, created_at FROM user_data ORDER BY created_at DESC",
        &[],
    ).await?;

    let mut data = Vec::new();
    for row in rows {
        data.push(crate::models::user_data::UserData {
            id: row.get(0),
            name: row.get(1),
            email: row.get(2),
            phone: row.get(3),
            message: row.get(4),
            created_at: row.get(5),
        });
    }

    Ok(data)
}
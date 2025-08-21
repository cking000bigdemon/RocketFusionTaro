use tokio_postgres::{Client, Error};
use std::sync::Arc;
use std::net::IpAddr;
use tokio::sync::Mutex;
use chrono::{DateTime, Utc, Duration};
use uuid::Uuid;

use crate::models::auth::{User, UserSession, LoginRequest, RegisterRequest, PasswordHash, generate_session_token};

pub type DbPool = Arc<Mutex<Client>>;

// 用户认证相关数据库操作
pub async fn authenticate_user(
    pool: &DbPool,
    login_req: &LoginRequest,
) -> Result<Option<User>, Error> {
    let client = pool.lock().await;
    
    println!("🔍 正在验证用户: {}", login_req.username);
    
    let row = client.query_opt(
        "SELECT id, username, email, password_hash, full_name, avatar_url, is_active, is_admin, last_login_at, created_at, updated_at 
         FROM users WHERE username = $1 AND is_active = true",
        &[&login_req.username],
    ).await?;

    if let Some(row) = row {
        println!("✅ 找到用户: {}", login_req.username);
        let password_hash: String = row.get(3);
        let hash = PasswordHash { hash: password_hash.clone() };
        
        println!("🔐 验证密码，存储的hash: {}", &password_hash[..20]);
        let password_valid = hash.verify(&login_req.password);
        println!("🔐 密码验证结果: {}", password_valid);
        
        if password_valid {
            println!("✅ 认证成功: {}", login_req.username);
            let user = User {
                id: row.get(0),
                username: row.get(1),
                email: row.get(2),
                full_name: row.get(4),
                avatar_url: row.get(5),
                is_active: row.get(6),
                is_admin: row.get(7),
                last_login_at: row.get(8),
                created_at: row.get(9),
                updated_at: row.get(10),
            };
            return Ok(Some(user));
        } else {
            println!("❌ 密码验证失败: {}", login_req.username);
        }
    } else {
        println!("❌ 用户不存在: {}", login_req.username);
    }
    
    Ok(None)
}

// 创建用户会话
pub async fn create_user_session(
    pool: &DbPool,
    user_id: Uuid,
    user_agent: Option<String>,
    ip_address: Option<IpAddr>,
) -> Result<UserSession, Error> {
    println!("🔧 开始创建用户会话, user_id: {}", user_id);
    let client = pool.lock().await;
    
    let session_token = generate_session_token();
    let expires_at = Utc::now() + Duration::days(7); // 7天有效期
    let now = Utc::now();
    
    println!("🔧 准备插入会话数据");
    let row = client.query_one(
        "INSERT INTO user_sessions (user_id, session_token, user_agent, ip_address, expires_at, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        &[&user_id, &session_token, &user_agent, &ip_address, &expires_at, &now],
    ).await?;
    
    println!("🔧 会话数据插入成功");
    let session_id: Uuid = row.get(0);
    
    Ok(UserSession {
        id: session_id,
        user_id,
        session_token,
        user_agent,
        ip_address: ip_address.map(|ip| ip.to_string()),
        expires_at,
        created_at: now,
    })
}

// 验证会话令牌
pub async fn validate_session(
    pool: &DbPool,
    session_token: &str,
) -> Result<Option<(User, UserSession)>, Error> {
    let client = pool.lock().await;
    
    let row = client.query_opt(
        "SELECT s.id, s.user_id, s.session_token, s.user_agent, s.ip_address, s.expires_at, s.created_at,
                u.id, u.username, u.email, u.full_name, u.avatar_url, u.is_active, u.is_admin, u.last_login_at, u.created_at, u.updated_at
         FROM user_sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.session_token = $1 AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = true",
        &[&session_token],
    ).await?;

    if let Some(row) = row {
        let session = UserSession {
            id: row.get(0),
            user_id: row.get(1),
            session_token: row.get(2),
            user_agent: row.get(3),
            ip_address: row.get::<_, Option<IpAddr>>(4).map(|ip| ip.to_string()),
            expires_at: row.get(5),
            created_at: row.get(6),
        };

        let user = User {
            id: row.get(7),
            username: row.get(8),
            email: row.get(9),
            full_name: row.get(10),
            avatar_url: row.get(11),
            is_active: row.get(12),
            is_admin: row.get(13),
            last_login_at: row.get(14),
            created_at: row.get(15),
            updated_at: row.get(16),
        };

        // 更新最后访问时间
        let _ = client.execute(
            "UPDATE user_sessions SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = $1",
            &[&session.id],
        ).await;

        return Ok(Some((user, session)));
    }
    
    Ok(None)
}

// 更新用户最后登录时间
pub async fn update_last_login(
    pool: &DbPool,
    user_id: Uuid,
) -> Result<(), Error> {
    let client = pool.lock().await;
    
    client.execute(
        "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1",
        &[&user_id],
    ).await?;
    
    Ok(())
}

// 注销会话
pub async fn logout_session(
    pool: &DbPool,
    session_token: &str,
) -> Result<bool, Error> {
    let client = pool.lock().await;
    
    let rows_affected = client.execute(
        "DELETE FROM user_sessions WHERE session_token = $1",
        &[&session_token],
    ).await?;
    
    Ok(rows_affected > 0)
}

// 记录登录日志
pub async fn log_login_attempt(
    pool: &DbPool,
    user_id: Option<Uuid>,
    username: &str,
    success: bool,
    ip_address: Option<IpAddr>,
    user_agent: Option<String>,
    failure_reason: Option<String>,
) -> Result<(), Error> {
    let client = pool.lock().await;
    
    let ip_str = ip_address.map(|ip| ip.to_string());
    
    client.execute(
        "INSERT INTO login_logs (user_id, username, login_success, ip_address, user_agent, failure_reason) 
         VALUES ($1, $2, $3, $4, $5, $6)",
        &[&user_id, &username, &success, &ip_str, &user_agent, &failure_reason],
    ).await?;
    
    Ok(())
}

/* 注册功能暂时禁用
// 注册新用户（暂时简化实现）
pub async fn register_user(
    _pool: &DbPool,
    _register_req: &RegisterRequest,
) -> Result<User, Error> {
    // 暂时返回错误，注册功能稍后完善  
    use std::io::{Error as IoError, ErrorKind};
    Err(Error::from(IoError::new(ErrorKind::Unsupported, "注册功能暂未实现")))
}
*/

// 清理过期会话
pub async fn cleanup_expired_sessions(pool: &DbPool) -> Result<u64, Error> {
    let client = pool.lock().await;
    
    let rows_affected = client.execute(
        "DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP",
        &[],
    ).await?;
    
    Ok(rows_affected)
}
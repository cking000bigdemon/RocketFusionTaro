use tokio_postgres::{Client, Error};
use std::sync::Arc;
use std::net::IpAddr;
use tokio::sync::Mutex;
use chrono::{Utc, Duration};
use uuid::Uuid;
use tracing::{info, warn, debug};

use crate::models::auth::{User, UserSession, LoginRequest, RegisterRequest, PasswordHash, generate_session_token};

pub type DbPool = Arc<Mutex<Client>>;

// 检查用户名是否已存在
pub async fn check_username_exists(
    pool: &DbPool,
    username: &str,
) -> Result<bool, Error> {
    let client = pool.lock().await;
    
    let row = client.query_opt(
        "SELECT id FROM users WHERE username = $1",
        &[&username],
    ).await?;
    
    Ok(row.is_some())
}

// 创建新用户
pub async fn create_user(
    pool: &DbPool,
    register_req: &RegisterRequest,
) -> Result<User, Error> {
    let client = pool.lock().await;
    
    let password_hash = PasswordHash::new(&register_req.password)
        .expect("Password hash should not fail");
    
    let now = Utc::now();
    let user_id = Uuid::new_v4();
    
    let row = client.query_one(
        "INSERT INTO users (id, username, email, password_hash, full_name, avatar_url, is_active, is_admin, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
         RETURNING id, username, email, full_name, avatar_url, is_active, is_admin, last_login_at, created_at, updated_at",
        &[&user_id, &register_req.username, &register_req.email, &password_hash.hash, 
          &None::<String>, &None::<String>, &true, &false, &now, &now],
    ).await?;

    info!("User created successfully: {}", register_req.username);
    
    Ok(User {
        id: row.get(0),
        username: row.get(1),
        email: row.get(2),
        full_name: row.get(3),
        avatar_url: row.get(4),
        is_active: row.get(5),
        is_admin: row.get(6),
        last_login_at: row.get(7),
        created_at: row.get(8),
        updated_at: row.get(9),
    })
}

// 用户认证相关数据库操作
pub async fn authenticate_user(
    pool: &DbPool,
    login_req: &LoginRequest,
) -> Result<Option<User>, Error> {
    let client = pool.lock().await;
    
    debug!("Authenticating user: {}", login_req.username);
    
    let row = client.query_opt(
        "SELECT id, username, email, password_hash, full_name, avatar_url, is_active, is_admin, last_login_at, created_at, updated_at 
         FROM users WHERE username = $1 AND is_active = true",
        &[&login_req.username],
    ).await?;

    if let Some(row) = row {
        debug!("User found: {}", login_req.username);
        let password_hash: String = row.get(3);
        let hash = PasswordHash { hash: password_hash.clone() };
        
        debug!("Verifying password for user: {}", login_req.username);
        let password_valid = hash.verify(&login_req.password);
        
        if password_valid {
            info!("Authentication successful for user: {}", login_req.username);
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
            warn!("Password verification failed for user: {}", login_req.username);
        }
    } else {
        warn!("User not found: {}", login_req.username);
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
    debug!("Creating user session for user_id: {}", user_id);
    let client = pool.lock().await;
    
    let session_token = generate_session_token();
    let expires_at = Utc::now() + Duration::days(7); // 7天有效期
    let now = Utc::now();
    let row = client.query_one(
        "INSERT INTO user_sessions (user_id, session_token, user_agent, ip_address, expires_at, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        &[&user_id, &session_token, &user_agent, &ip_address, &expires_at, &now],
    ).await?;
    
    let session_id: Uuid = row.get(0);
    info!("User session created successfully with id: {}", session_id);
    
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
        if let Err(e) = client.execute(
            "UPDATE user_sessions SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = $1",
            &[&session.id],
        ).await {
            warn!("Failed to update last_accessed_at: {}", e);
        }

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


// 清理过期会话
pub async fn cleanup_expired_sessions(pool: &DbPool) -> Result<u64, Error> {
    let client = pool.lock().await;
    
    let rows_affected = client.execute(
        "DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP",
        &[],
    ).await?;
    
    Ok(rows_affected)
}
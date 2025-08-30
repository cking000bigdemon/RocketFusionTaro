use tokio_postgres::Error;
use uuid::Uuid;
use tracing::{info, error};

use crate::models::wx_auth::{Code2SessionResponse, WxUser};
use crate::database::DbPool;

pub async fn code2session(app_id: &str, app_secret: &str, code: &str) -> Result<Code2SessionResponse, String> {
    let url = format!(
        "https://api.weixin.qq.com/sns/jscode2session?appid={}&secret={}&js_code={}&grant_type=authorization_code",
        app_id, app_secret, code
    );
    
    info!("Calling WeChat API: code2session with code: {}", code);
    info!("WeChat API URL: {}", url);
    
    let response = reqwest::get(&url)
        .await
        .map_err(|e| {
            error!("HTTP request to WeChat API failed: {}", e);
            format!("HTTP request failed: {}", e)
        })?;
    
    info!("WeChat API response status: {}", response.status());
        
    if !response.status().is_success() {
        error!("WeChat API returned non-success status: {}", response.status());
        return Err(format!("WeChat API returned error: {}", response.status()));
    }
    
    // 先获取响应文本进行调试
    let response_text = response.text().await
        .map_err(|e| {
            error!("Failed to get WeChat API response text: {}", e);
            format!("Failed to get response text: {}", e)
        })?;
    
    info!("WeChat API raw response: {}", response_text);
    
    let wx_response: Code2SessionResponse = serde_json::from_str(&response_text)
        .map_err(|e| {
            error!("Failed to parse WeChat response as JSON: {}", e);
            format!("Failed to parse WeChat response: {}", e)
        })?;
        
    if let Some(errcode) = wx_response.errcode {
        if errcode != 0 {
            let errmsg = wx_response.errmsg.unwrap_or_else(|| "Unknown error".to_string());
            error!("WeChat API returned error code {}: {}", errcode, errmsg);
            return Err(format!("WeChat API error {}: {}", errcode, errmsg));
        }
    }
    
    info!("WeChat code2session successful, openid: {:?}", wx_response.openid);
    Ok(wx_response)
}

pub async fn find_user_by_openid(pool: &DbPool, openid: &str) -> Result<Option<WxUser>, Error> {
    let client = pool.lock().await;
    
    let row = client.query_opt(
        "SELECT id, username, email, full_name, avatar_url, is_active, is_admin, is_guest,
                wx_openid, wx_unionid, wx_session_key, last_login_at, created_at, updated_at
         FROM users WHERE wx_openid = $1",
        &[&openid],
    ).await?;

    if let Some(row) = row {
        let wx_user = WxUser {
            id: row.get(0),
            username: row.get(1),
            email: row.get(2),
            full_name: row.get(3),
            avatar_url: row.get(4),
            is_active: row.get(5),
            is_admin: row.get(6),
            is_guest: row.get(7),
            wx_openid: row.get(8),
            wx_unionid: row.get(9),
            wx_session_key: row.get(10),
            last_login_at: row.get(11),
            created_at: row.get(12),
            updated_at: row.get(13),
        };
        Ok(Some(wx_user))
    } else {
        Ok(None)
    }
}

pub async fn create_wx_user(
    pool: &DbPool,
    openid: &str,
    unionid: Option<&str>,
    session_key: &str,
) -> Result<WxUser, Error> {
    let client = pool.lock().await;
    
    let username = format!("wx_{}", &openid[..8]);
    let email = format!("{}@wx.temp", &openid[..10]);
    
    info!("Creating new WeChat user with openid: {}", openid);
    
    let row = client.query_one(
        "INSERT INTO users (username, email, password_hash, is_active, is_guest, wx_openid, wx_unionid, wx_session_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, username, email, full_name, avatar_url, is_active, is_admin, is_guest,
                   wx_openid, wx_unionid, wx_session_key, last_login_at, created_at, updated_at",
        &[
            &username,
            &email,
            &"",  // 微信用户无需密码
            &true,
            &true,  // 微信用户标记为guest
            &openid,
            &unionid,
            &session_key,
        ],
    ).await?;

    let wx_user = WxUser {
        id: row.get(0),
        username: row.get(1),
        email: row.get(2),
        full_name: row.get(3),
        avatar_url: row.get(4),
        is_active: row.get(5),
        is_admin: row.get(6),
        is_guest: row.get(7),
        wx_openid: row.get(8),
        wx_unionid: row.get(9),
        wx_session_key: row.get(10),
        last_login_at: row.get(11),
        created_at: row.get(12),
        updated_at: row.get(13),
    };
    
    Ok(wx_user)
}

pub async fn update_wx_user_session(
    pool: &DbPool,
    user_id: Uuid,
    session_key: &str,
) -> Result<(), Error> {
    let client = pool.lock().await;
    
    client.execute(
        "UPDATE users SET wx_session_key = $1, updated_at = CURRENT_TIMESTAMP, last_login_at = CURRENT_TIMESTAMP
         WHERE id = $2",
        &[&session_key, &user_id],
    ).await?;
    
    info!("Updated WeChat session for user: {}", user_id);
    Ok(())
}

pub async fn update_wx_user_profile(
    pool: &DbPool,
    user_id: Uuid,
    full_name: &str,
    avatar_url: &str,
) -> Result<(), Error> {
    let client = pool.lock().await;
    
    client.execute(
        "UPDATE users SET full_name = $1, avatar_url = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3",
        &[&full_name, &avatar_url, &user_id],
    ).await?;
    
    info!("Updated WeChat user profile for user: {}, name: {}, avatar: {}", user_id, full_name, avatar_url);
    Ok(())
}
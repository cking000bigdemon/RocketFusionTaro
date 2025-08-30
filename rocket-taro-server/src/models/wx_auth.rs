use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Deserialize, Debug)]
pub struct WxLoginRequest {
    pub code: String,
    pub encrypted_data: Option<String>,
    pub iv: Option<String>,
    pub signature: Option<String>,
    pub raw_data: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct WxLoginResponse {
    pub user: crate::models::auth::UserInfo,
    pub session_token: String,
    pub expires_at: DateTime<Utc>,
}

#[derive(Deserialize, Debug)]
pub struct Code2SessionResponse {
    pub openid: String,
    pub session_key: String,
    pub unionid: Option<String>,
    pub errcode: Option<i32>,
    pub errmsg: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WxUser {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub is_active: bool,
    pub is_admin: bool,
    pub is_guest: bool,
    pub wx_openid: Option<String>,
    pub wx_unionid: Option<String>,
    pub wx_session_key: Option<String>,
    pub last_login_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<WxUser> for crate::models::auth::User {
    fn from(wx_user: WxUser) -> Self {
        crate::models::auth::User {
            id: wx_user.id,
            username: wx_user.username,
            email: wx_user.email,
            full_name: wx_user.full_name,
            avatar_url: wx_user.avatar_url,
            is_active: wx_user.is_active,
            is_admin: wx_user.is_admin,
            is_guest: wx_user.is_guest,
            wx_openid: wx_user.wx_openid,
            wx_unionid: wx_user.wx_unionid,
            wx_session_key: wx_user.wx_session_key,
            last_login_at: wx_user.last_login_at,
            created_at: wx_user.created_at,
            updated_at: wx_user.updated_at,
        }
    }
}
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub is_active: bool,
    pub is_admin: bool,
    pub is_guest: bool,
    pub last_login_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Deserialize, Debug)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
    pub confirm_password: String,
    pub email: String,
    pub phone: String,
}

#[derive(Serialize, Debug)]
pub struct LoginResponse {
    pub user: UserInfo,
    pub session_token: String,
    pub expires_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UserInfo {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub is_admin: bool,
    pub is_guest: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UserSession {
    pub id: Uuid,
    pub user_id: Uuid,
    pub session_token: String,
    pub user_agent: Option<String>,
    pub ip_address: Option<String>,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

impl From<User> for UserInfo {
    fn from(user: User) -> Self {
        UserInfo {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            is_admin: user.is_admin,
            is_guest: user.is_guest,
        }
    }
}


// 密码验证结构
#[derive(Debug)]
pub struct PasswordHash {
    pub hash: String,
}

impl PasswordHash {
    pub fn new(password: &str) -> Result<Self, bcrypt::BcryptError> {
        let hash = bcrypt::hash(password, bcrypt::DEFAULT_COST)?;
        Ok(PasswordHash { hash })
    }

    pub fn verify(&self, password: &str) -> bool {
        bcrypt::verify(password, &self.hash).unwrap_or(false)
    }
}

// 会话令牌生成
pub fn generate_session_token() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let bytes: [u8; 32] = rng.gen();
    BASE64.encode(bytes)
}
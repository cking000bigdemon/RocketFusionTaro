use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UserData {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub message: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Deserialize, Debug)]
pub struct NewUserData {
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub message: Option<String>,
}

impl UserData {
    pub fn new(data: NewUserData) -> Self {
        Self {
            id: Uuid::new_v4(),
            name: data.name,
            email: data.email,
            phone: data.phone,
            message: data.message,
            created_at: Utc::now(),
        }
    }
}
use rocket::{Request, State, request::{self, FromRequest}, http::Status};
use crate::database::{DbPool, auth::validate_session};
use crate::models::auth::{User, UserSession};

#[derive(Debug)]
pub struct AuthenticatedUser {
    pub user: User,
    pub session: UserSession,
}

#[derive(Debug)]
pub enum AuthError {
    Missing,
    Invalid,
    Expired,
    DatabaseError,
}

// 认证用户请求守卫
#[rocket::async_trait]
impl<'r> FromRequest<'r> for AuthenticatedUser {
    type Error = AuthError;

    async fn from_request(req: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
        // 从Cookie或Authorization头获取会话令牌
        let session_token = req.cookies()
            .get_private("session_token")
            .and_then(|cookie| Some(cookie.value().to_string()))
            .or_else(|| {
                req.headers()
                    .get_one("Authorization")
                    .and_then(|auth| {
                        if auth.starts_with("Bearer ") {
                            Some(auth[7..].to_string())
                        } else {
                            None
                        }
                    })
            });

        if let Some(token) = session_token {
            if let Some(db_pool) = req.guard::<&State<DbPool>>().await.succeeded() {
                match validate_session(db_pool, &token).await {
                    Ok(Some((user, session))) => {
                        request::Outcome::Success(AuthenticatedUser { user, session })
                    }
                    Ok(None) => request::Outcome::Error((Status::Unauthorized, AuthError::Invalid)),
                    Err(_) => request::Outcome::Error((Status::InternalServerError, AuthError::DatabaseError)),
                }
            } else {
                request::Outcome::Error((Status::InternalServerError, AuthError::DatabaseError))
            }
        } else {
            request::Outcome::Error((Status::Unauthorized, AuthError::Missing))
        }
    }
}

// 可选认证用户请求守卫
pub struct OptionalUser(pub Option<AuthenticatedUser>);

#[rocket::async_trait]
impl<'r> FromRequest<'r> for OptionalUser {
    type Error = ();

    async fn from_request(req: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
        match AuthenticatedUser::from_request(req).await {
            request::Outcome::Success(user) => request::Outcome::Success(OptionalUser(Some(user))),
            _ => request::Outcome::Success(OptionalUser(None)),
        }
    }
}

// 管理员请求守卫
pub struct AdminUser(pub AuthenticatedUser);

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AdminUser {
    type Error = AuthError;

    async fn from_request(req: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
        match AuthenticatedUser::from_request(req).await {
            request::Outcome::Success(auth_user) => {
                if auth_user.user.is_admin {
                    request::Outcome::Success(AdminUser(auth_user))
                } else {
                    request::Outcome::Error((Status::Forbidden, AuthError::Invalid))
                }
            }
            request::Outcome::Error(e) => request::Outcome::Error(e),
            request::Outcome::Forward(f) => request::Outcome::Forward(f),
        }
    }
}
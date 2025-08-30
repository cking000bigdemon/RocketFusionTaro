use aes::Aes128;
use cbc::{Decryptor, cipher::{KeyIvInit, BlockDecryptMut, block_padding::Pkcs7}};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use sha1::{Sha1, Digest};
use hex;
use serde::{Deserialize, Serialize};
use tracing::{info, error, warn};

type Aes128CbcDec = Decryptor<Aes128>;

#[derive(Debug, Serialize, Deserialize)]
pub struct DecryptedUserInfo {
    #[serde(rename = "openId")]
    pub open_id: String,
    #[serde(rename = "nickName")]
    pub nick_name: String,
    pub gender: u8,
    pub language: String,
    pub city: String,
    pub province: String,
    pub country: String,
    #[serde(rename = "avatarUrl")]
    pub avatar_url: String,
    #[serde(rename = "unionId")]
    pub union_id: Option<String>,
    pub watermark: Watermark,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Watermark {
    pub appid: String,
    pub timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserProfileInfo {
    #[serde(rename = "nickName")]
    pub nick_name: String,
    #[serde(rename = "avatarUrl")]
    pub avatar_url: String,
    #[serde(default)]
    pub gender: u8,
    #[serde(default)]
    pub language: String,
    #[serde(default)]
    pub city: String,
    #[serde(default)]
    pub province: String,
    #[serde(default)]
    pub country: String,
    #[serde(rename = "is_demote", default)]
    pub is_demote: bool,
}

#[derive(Debug)]
pub struct WxCrypto;

impl WxCrypto {
    /// 验证数据签名
    pub fn verify_signature(raw_data: &str, session_key: &str, signature: &str) -> Result<bool, String> {
        info!("开始验证微信数据签名");
        
        // 构建签名字符串: rawData + session_key
        let sign_string = format!("{}{}", raw_data, session_key);
        
        // 使用SHA1计算签名
        let mut hasher = Sha1::new();
        hasher.update(sign_string.as_bytes());
        let result = hasher.finalize();
        let computed_signature = hex::encode(result);
        
        info!("计算出的签名: {}", computed_signature);
        info!("接收到的签名: {}", signature);
        
        // 比较签名（忽略大小写）
        let is_valid = computed_signature.to_lowercase() == signature.to_lowercase();
        
        if is_valid {
            info!("数据签名验证成功");
        } else {
            warn!("数据签名验证失败");
        }
        
        Ok(is_valid)
    }
    
    /// 解密微信用户数据
    pub fn decrypt_user_info(
        encrypted_data: &str, 
        session_key: &str, 
        iv: &str
    ) -> Result<DecryptedUserInfo, String> {
        info!("开始解密微信用户数据");
        
        // Base64解码
        let encrypted_bytes = BASE64.decode(encrypted_data)
            .map_err(|e| {
                error!("Base64解码encryptedData失败: {}", e);
                format!("Base64解码失败: {}", e)
            })?;
            
        let session_key_bytes = BASE64.decode(session_key)
            .map_err(|e| {
                error!("Base64解码session_key失败: {}", e);
                format!("Session key解码失败: {}", e)
            })?;
            
        let iv_bytes = BASE64.decode(iv)
            .map_err(|e| {
                error!("Base64解码iv失败: {}", e);
                format!("IV解码失败: {}", e)
            })?;
        
        info!("Base64解码完成，开始AES解密");
        
        // 验证密钥和IV长度
        if session_key_bytes.len() != 16 {
            let error_msg = format!("Session key长度错误，期望16字节，实际{}字节", session_key_bytes.len());
            error!("{}", error_msg);
            return Err(error_msg);
        }
        
        if iv_bytes.len() != 16 {
            let error_msg = format!("IV长度错误，期望16字节，实际{}字节", iv_bytes.len());
            error!("{}", error_msg);
            return Err(error_msg);
        }
        
        // AES-128-CBC解密
        let cipher = Aes128CbcDec::new_from_slices(&session_key_bytes, &iv_bytes)
            .map_err(|e| {
                error!("创建AES解密器失败: {}", e);
                format!("创建解密器失败: {}", e)
            })?;
            
        let mut encrypted_data_copy = encrypted_bytes.clone();
        let decrypted_data = cipher.decrypt_padded_mut::<Pkcs7>(&mut encrypted_data_copy)
            .map_err(|e| {
                error!("AES解密失败: {}", e);
                format!("解密失败: {}", e)
            })?;
        
        // 转换为UTF-8字符串
        let decrypted_text = String::from_utf8(decrypted_data.to_vec())
            .map_err(|e| {
                error!("解密结果UTF-8转换失败: {}", e);
                format!("UTF-8转换失败: {}", e)
            })?;
        
        info!("解密成功，解密后的数据: {}", decrypted_text);
        
        // 解析JSON
        let user_info: DecryptedUserInfo = serde_json::from_str(&decrypted_text)
            .map_err(|e| {
                error!("解析用户信息JSON失败: {}", e);
                format!("JSON解析失败: {}", e)
            })?;
        
        info!("用户信息解析成功，昵称: {}, 头像: {}", user_info.nick_name, user_info.avatar_url);
        
        Ok(user_info)
    }
    
    /// 验证水印
    pub fn verify_watermark(user_info: &DecryptedUserInfo, expected_appid: &str) -> Result<bool, String> {
        info!("开始验证数据水印");
        
        let is_valid = user_info.watermark.appid == expected_appid;
        
        if is_valid {
            info!("数据水印验证成功，AppID匹配");
        } else {
            warn!("数据水印验证失败，AppID不匹配。期望: {}, 实际: {}", 
                 expected_appid, user_info.watermark.appid);
        }
        
        // 可选：验证时间戳（这里暂时不验证时效性）
        let now = chrono::Utc::now().timestamp();
        let watermark_time = user_info.watermark.timestamp;
        info!("数据时间戳: {}, 当前时间戳: {}", watermark_time, now);
        
        Ok(is_valid)
    }
    
    /// 解密微信用户Profile数据（专门用于wx.getUserProfile）
    pub fn decrypt_user_profile(
        encrypted_data: &str, 
        session_key: &str, 
        iv: &str
    ) -> Result<UserProfileInfo, String> {
        info!("开始解密微信用户Profile数据");
        
        // Base64解码
        let encrypted_bytes = BASE64.decode(encrypted_data)
            .map_err(|e| {
                error!("Base64解码encryptedData失败: {}", e);
                format!("Base64解码失败: {}", e)
            })?;
            
        let session_key_bytes = BASE64.decode(session_key)
            .map_err(|e| {
                error!("Base64解码session_key失败: {}", e);
                format!("Session key解码失败: {}", e)
            })?;
            
        let iv_bytes = BASE64.decode(iv)
            .map_err(|e| {
                error!("Base64解码iv失败: {}", e);
                format!("IV解码失败: {}", e)
            })?;
        
        info!("Base64解码完成，开始AES解密");
        
        // 验证密钥和IV长度
        if session_key_bytes.len() != 16 {
            let error_msg = format!("Session key长度错误，期望16字节，实际{}字节", session_key_bytes.len());
            error!("{}", error_msg);
            return Err(error_msg);
        }
        
        if iv_bytes.len() != 16 {
            let error_msg = format!("IV长度错误，期望16字节，实际{}字节", iv_bytes.len());
            error!("{}", error_msg);
            return Err(error_msg);
        }
        
        // AES-128-CBC解密
        let cipher = Aes128CbcDec::new_from_slices(&session_key_bytes, &iv_bytes)
            .map_err(|e| {
                error!("创建AES解密器失败: {}", e);
                format!("创建解密器失败: {}", e)
            })?;
            
        let mut encrypted_data_copy = encrypted_bytes.clone();
        let decrypted_data = cipher.decrypt_padded_mut::<Pkcs7>(&mut encrypted_data_copy)
            .map_err(|e| {
                error!("AES解密失败: {}", e);
                format!("解密失败: {}", e)
            })?;
        
        // 转换为UTF-8字符串
        let decrypted_text = String::from_utf8(decrypted_data.to_vec())
            .map_err(|e| {
                error!("解密结果UTF-8转换失败: {}", e);
                format!("UTF-8转换失败: {}", e)
            })?;
        
        info!("Profile数据解密成功，解密后的数据: {}", decrypted_text);
        
        // 解析JSON为UserProfileInfo
        let profile_info: UserProfileInfo = serde_json::from_str(&decrypted_text)
            .map_err(|e| {
                error!("解析Profile信息JSON失败: {}", e);
                format!("JSON解析失败: {}", e)
            })?;
        
        info!("Profile信息解析成功，昵称: {}, 头像: {}", profile_info.nick_name, profile_info.avatar_url);
        
        Ok(profile_info)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_signature_verification() {
        let raw_data = r#"{"nickName":"Band","gender":1,"language":"zh_CN","city":"Guangzhou","province":"Guangdong","country":"CN","avatarUrl":"http://wx.qlogo.cn/mmopen/vi_32/1vZvI39NWFQ9XM4LtQpFrQJ1xlgZxx3w7bQxKARol6503Iuswjjn6nIGBiaycAjAtpujxyzYsrztuuICqIM5ibXQ/0"}"#;
        let session_key = "HyVFkGl5F5OQWJZZaNzBBg==";
        let signature = "75e81ceda165f4ffa64f4068af58c64b8f54b88c";
        
        let result = WxCrypto::verify_signature(raw_data, session_key, signature);
        assert!(result.is_ok());
        assert!(result.unwrap());
    }
}
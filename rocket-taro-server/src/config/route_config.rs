use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use anyhow::{Context, Result};

/// 平台类型枚举
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Miniprogram,
    H5,
    Admin,
}

impl Platform {
    /// 从字符串解析平台类型
    pub fn from_str(s: &str) -> Option<Platform> {
        match s.to_lowercase().as_str() {
            "miniprogram" | "weapp" | "mp" => Some(Platform::Miniprogram),
            "h5" | "web" | "mobile" => Some(Platform::H5),
            "admin" | "desktop" | "pc" => Some(Platform::Admin),
            _ => None,
        }
    }
    
    /// 从 User-Agent 检测平台
    pub fn from_user_agent(user_agent: &str) -> Platform {
        let ua = user_agent.to_lowercase();
        if ua.contains("miniprogram") || ua.contains("micromessenger") {
            Platform::Miniprogram
        } else if ua.contains("mobile") || ua.contains("android") || ua.contains("iphone") {
            Platform::H5
        } else {
            Platform::Admin
        }
    }
}

impl Default for Platform {
    fn default() -> Self {
        Platform::Miniprogram
    }
}

/// 单个路由的平台配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteEntry {
    pub miniprogram: String,
    pub h5: String,
    pub admin: String,
}

/// 路由分组配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteGroup {
    #[serde(flatten)]
    pub routes: HashMap<String, RouteEntry>,
}

/// 默认配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Defaults {
    pub platform: Platform,
}

/// 完整的路由配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutesConfig {
    pub routes: HashMap<String, RouteGroup>,
    pub defaults: Defaults,
}

/// 路由配置管理器
#[derive(Debug, Clone)]
pub struct RouteConfig {
    config: RoutesConfig,
}

impl RouteConfig {
    /// 从文件加载路由配置
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let content = std::fs::read_to_string(path)
            .context("Failed to read route config file")?;
        
        let config: RoutesConfig = toml::from_str(&content)
            .context("Failed to parse route config TOML")?;
        
        Ok(RouteConfig { config })
    }
    
    /// 获取指定路由和平台的路径
    pub fn get_route(&self, route_key: &str, platform: Platform) -> Option<String> {
        let parts: Vec<&str> = route_key.split('.').collect();
        if parts.len() != 2 {
            return None;
        }
        
        let (group_name, route_name) = (parts[0], parts[1]);
        
        let group = self.config.routes.get(group_name)?;
        let route_entry = group.routes.get(route_name)?;
        
        let path = match platform {
            Platform::Miniprogram => &route_entry.miniprogram,
            Platform::H5 => &route_entry.h5,
            Platform::Admin => &route_entry.admin,
        };
        
        Some(path.clone())
    }
    
    /// 获取路由，使用默认平台
    pub fn get_route_default(&self, route_key: &str) -> Option<String> {
        self.get_route(route_key, self.config.defaults.platform.clone())
    }
    
    /// 获取所有可用的路由键
    pub fn get_all_route_keys(&self) -> Vec<String> {
        let mut keys = Vec::new();
        for (group_name, group) in &self.config.routes {
            for route_name in group.routes.keys() {
                keys.push(format!("{}.{}", group_name, route_name));
            }
        }
        keys.sort();
        keys
    }
    
    /// 验证配置的完整性
    pub fn validate(&self) -> Result<()> {
        for (group_name, group) in &self.config.routes {
            for (route_name, route_entry) in &group.routes {
                let route_key = format!("{}.{}", group_name, route_name);
                
                // 检查路径是否为空
                if route_entry.miniprogram.is_empty() {
                    anyhow::bail!("Route {} miniprogram path is empty", route_key);
                }
                if route_entry.h5.is_empty() {
                    anyhow::bail!("Route {} h5 path is empty", route_key);
                }
                if route_entry.admin.is_empty() {
                    anyhow::bail!("Route {} admin path is empty", route_key);
                }
                
                // 检查路径格式（应该以 / 开头）
                if !route_entry.miniprogram.starts_with('/') {
                    anyhow::bail!("Route {} miniprogram path should start with /", route_key);
                }
                if !route_entry.h5.starts_with('/') {
                    anyhow::bail!("Route {} h5 path should start with /", route_key);
                }
                if !route_entry.admin.starts_with('/') {
                    anyhow::bail!("Route {} admin path should start with /", route_key);
                }
            }
        }
        Ok(())
    }
    
    /// 检查给定平台的路由路径是否存在于配置中
    pub fn is_valid_path(&self, path: &str, platform: Platform) -> bool {
        for group in self.config.routes.values() {
            for route_entry in group.routes.values() {
                let config_path = match platform {
                    Platform::Miniprogram => &route_entry.miniprogram,
                    Platform::H5 => &route_entry.h5,
                    Platform::Admin => &route_entry.admin,
                };
                if config_path == path {
                    return true;
                }
            }
        }
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_platform_from_str() {
        assert_eq!(Platform::from_str("miniprogram"), Some(Platform::Miniprogram));
        assert_eq!(Platform::from_str("h5"), Some(Platform::H5));
        assert_eq!(Platform::from_str("admin"), Some(Platform::Admin));
        assert_eq!(Platform::from_str("unknown"), None);
    }
    
    #[test]
    fn test_platform_from_user_agent() {
        assert_eq!(
            Platform::from_user_agent("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 MiniProgram"),
            Platform::Miniprogram
        );
        assert_eq!(
            Platform::from_user_agent("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"),
            Platform::H5
        );
        assert_eq!(
            Platform::from_user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"),
            Platform::Admin
        );
    }
}
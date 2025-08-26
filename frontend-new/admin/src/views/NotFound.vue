<template>
  <div class="not-found-page">
    <div class="not-found-container">
      <div class="not-found-image">
        <div class="error-code">404</div>
        <div class="error-icon">🚀</div>
      </div>
      
      <div class="not-found-content">
        <h1 class="error-title">页面未找到</h1>
        <p class="error-description">
          抱歉，您访问的页面不存在或已被移除。
          <br>
          请检查网址是否正确，或返回首页继续浏览。
        </p>
        
        <div class="error-actions">
          <el-button type="primary" size="large" @click="goHome">
            <el-icon><HomeFilled /></el-icon>
            返回首页
          </el-button>
          
          <el-button size="large" @click="goBack">
            <el-icon><Back /></el-icon>
            返回上页
          </el-button>
        </div>
        
        <div class="help-links">
          <el-text class="help-text">您也可以尝试：</el-text>
          <div class="links">
            <el-link @click="goTo('/dashboard')">
              <el-icon><Odometer /></el-icon>
              仪表板
            </el-link>
            <el-link @click="goTo('/users')">
              <el-icon><User /></el-icon>
              用户管理
            </el-link>
            <el-link @click="goTo('/user-data')">
              <el-icon><DataAnalysis /></el-icon>
              用户数据
            </el-link>
            <el-link @click="goTo('/settings')">
              <el-icon><Setting /></el-icon>
              系统设置
            </el-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

// 返回首页
const goHome = () => {
  router.push('/dashboard')
}

// 返回上一页
const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    goHome()
  }
}

// 跳转到指定页面
const goTo = (path: string) => {
  router.push(path)
}
</script>

<style lang="scss" scoped>
.not-found-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
}

.not-found-container {
  max-width: 800px;
  display: flex;
  align-items: center;
  gap: 60px;
  background: white;
  padding: 60px;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.not-found-image {
  flex: 0 0 300px;
  text-align: center;
  position: relative;
}

.error-code {
  font-size: 120px;
  font-weight: 900;
  color: var(--el-color-primary);
  line-height: 1;
  margin-bottom: 20px;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 4px;
    background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-success) 100%);
    border-radius: 2px;
  }
}

.error-icon {
  font-size: 80px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

.not-found-content {
  flex: 1;
  
  .error-title {
    font-size: 32px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0 0 16px 0;
  }
  
  .error-description {
    font-size: 16px;
    color: var(--el-text-color-secondary);
    line-height: 1.6;
    margin: 0 0 32px 0;
  }
  
  .error-actions {
    display: flex;
    gap: 16px;
    margin-bottom: 40px;
    
    .el-button {
      height: 48px;
      padding: 0 24px;
      font-size: 16px;
      
      .el-icon {
        margin-right: 8px;
      }
    }
  }
  
  .help-links {
    .help-text {
      font-size: 14px;
      color: var(--el-text-color-secondary);
      display: block;
      margin-bottom: 12px;
    }
    
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      
      .el-link {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        
        &:hover {
          color: var(--el-color-primary);
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 1024px) {
  .not-found-container {
    flex-direction: column;
    gap: 40px;
    padding: 40px;
    
    .not-found-image {
      flex: none;
    }
    
    .error-code {
      font-size: 100px;
    }
    
    .error-icon {
      font-size: 60px;
    }
  }
}

@media (max-width: 768px) {
  .not-found-page {
    padding: 16px;
  }
  
  .not-found-container {
    padding: 30px 20px;
    gap: 30px;
  }
  
  .not-found-image {
    .error-code {
      font-size: 80px;
    }
    
    .error-icon {
      font-size: 50px;
    }
  }
  
  .not-found-content {
    text-align: center;
    
    .error-title {
      font-size: 24px;
    }
    
    .error-description {
      font-size: 14px;
    }
    
    .error-actions {
      flex-direction: column;
      
      .el-button {
        width: 100%;
      }
    }
    
    .help-links {
      .links {
        justify-content: center;
      }
    }
  }
}

@media (max-width: 480px) {
  .not-found-container {
    padding: 20px 16px;
  }
  
  .not-found-image {
    .error-code {
      font-size: 60px;
    }
    
    .error-icon {
      font-size: 40px;
    }
  }
  
  .not-found-content {
    .error-title {
      font-size: 20px;
    }
    
    .error-actions {
      .el-button {
        height: 44px;
        font-size: 14px;
      }
    }
  }
}

// 暗色模式适配
.dark {
  .not-found-page {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%);
  }
  
  .not-found-container {
    background: var(--el-bg-color);
  }
}
</style>
#!/usr/bin/env node

/**
 * 单端开发约束机制脚本
 * 防止同时开发小程序和H5端，确保专注单一平台开发
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, '../.current-platform')
const FRONTEND_DIR = path.join(__dirname, '../frontend-new')
const H5_DIR = path.join(FRONTEND_DIR, 'mobile/h5')
const MINI_PROGRAM_DIR = path.join(FRONTEND_DIR, 'mobile/mini-program')
const ADMIN_DIR = path.join(FRONTEND_DIR, 'admin')

// 平台配置
const PLATFORMS = {
  h5: {
    name: 'H5移动端',
    dir: H5_DIR,
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    lockFile: 'package-lock.json'
  },
  miniprogram: {
    name: '微信小程序',
    dir: MINI_PROGRAM_DIR,
    devCommand: 'npm run dev:weapp',
    buildCommand: 'npm run build:weapp',
    lockFile: 'project.config.json'
  },
  admin: {
    name: '管理后台',
    dir: ADMIN_DIR,
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    lockFile: 'package-lock.json'
  }
}

/**
 * 获取当前活跃平台
 */
function getCurrentPlatform() {
  if (fs.existsSync(CONFIG_FILE)) {
    const content = fs.readFileSync(CONFIG_FILE, 'utf8').trim()
    return content || null
  }
  return null
}

/**
 * 设置当前活跃平台
 */
function setCurrentPlatform(platform) {
  fs.writeFileSync(CONFIG_FILE, platform)
  console.log(`✅ 已设置当前开发平台为: ${PLATFORMS[platform].name}`)
}

/**
 * 检查是否有其他平台的开发进程
 */
function checkRunningProcesses() {
  const runningPlatforms = []
  
  try {
    // 检查Node.js进程
    const processes = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', { encoding: 'utf8' })
    const lines = processes.split('\n')
    
    for (const platform in PLATFORMS) {
      if (platform === getCurrentPlatform()) continue
      
      // 检查平台相关进程
      const platformConfig = PLATFORMS[platform]
      const hasProcess = lines.some(line => 
        line.includes(platformConfig.dir.replace(/\\/g, '/')) || 
        line.includes(platformConfig.devCommand)
      )
      
      if (hasProcess) {
        runningPlatforms.push(platform)
      }
    }
  } catch (error) {
    console.warn('⚠️ 无法检查运行中的进程:', error.message)
  }
  
  return runningPlatforms
}

/**
 * 锁定其他平台
 */
function lockOtherPlatforms(currentPlatform) {
  for (const platform in PLATFORMS) {
    if (platform === currentPlatform) continue
    
    const platformConfig = PLATFORMS[platform]
    const lockFilePath = path.join(platformConfig.dir, '.platform-locked')
    
    // 创建锁定文件
    const lockContent = JSON.stringify({
      lockedBy: currentPlatform,
      lockedAt: new Date().toISOString(),
      message: `当前正在开发 ${PLATFORMS[currentPlatform].name}，${platformConfig.name} 已被锁定`
    }, null, 2)
    
    fs.writeFileSync(lockFilePath, lockContent)
    console.log(`🔒 已锁定 ${platformConfig.name}`)
  }
}

/**
 * 解锁所有平台
 */
function unlockAllPlatforms() {
  for (const platform in PLATFORMS) {
    const platformConfig = PLATFORMS[platform]
    const lockFilePath = path.join(platformConfig.dir, '.platform-locked')
    
    if (fs.existsSync(lockFilePath)) {
      fs.unlinkSync(lockFilePath)
      console.log(`🔓 已解锁 ${platformConfig.name}`)
    }
  }
  
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE)
  }
  
  console.log('✅ 所有平台已解锁')
}

/**
 * 检查平台是否被锁定
 */
function isPlatformLocked(platform) {
  const platformConfig = PLATFORMS[platform]
  const lockFilePath = path.join(platformConfig.dir, '.platform-locked')
  
  if (fs.existsSync(lockFilePath)) {
    const lockInfo = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'))
    return lockInfo
  }
  
  return null
}

/**
 * 显示平台状态
 */
function showStatus() {
  const currentPlatform = getCurrentPlatform()
  
  console.log('\n📊 平台开发状态:')
  console.log('='.repeat(50))
  
  if (currentPlatform) {
    console.log(`🟢 当前活跃平台: ${PLATFORMS[currentPlatform].name}`)
  } else {
    console.log('⚪ 当前无活跃平台')
  }
  
  console.log('\n平台详情:')
  for (const platform in PLATFORMS) {
    const config = PLATFORMS[platform]
    const lockInfo = isPlatformLocked(platform)
    const isCurrent = platform === currentPlatform
    
    let status = '⚪ 可用'
    if (isCurrent) {
      status = '🟢 开发中'
    } else if (lockInfo) {
      status = `🔒 已锁定 (被 ${PLATFORMS[lockInfo.lockedBy].name} 锁定)`
    }
    
    console.log(`  ${config.name}: ${status}`)
  }
}

/**
 * 切换到指定平台
 */
function switchTo(platform) {
  if (!PLATFORMS[platform]) {
    console.error(`❌ 无效的平台: ${platform}`)
    console.log('可用平台:', Object.keys(PLATFORMS).join(', '))
    process.exit(1)
  }
  
  const currentPlatform = getCurrentPlatform()
  
  // 检查是否已经是当前平台
  if (currentPlatform === platform) {
    console.log(`✅ ${PLATFORMS[platform].name} 已经是当前活跃平台`)
    return
  }
  
  // 检查是否有运行中的进程
  const runningPlatforms = checkRunningProcesses()
  if (runningPlatforms.length > 0) {
    console.error('❌ 检测到其他平台的开发进程正在运行:')
    runningPlatforms.forEach(p => {
      console.error(`  - ${PLATFORMS[p].name}`)
    })
    console.error('请先停止这些进程后再切换平台')
    process.exit(1)
  }
  
  // 解锁所有平台
  unlockAllPlatforms()
  
  // 设置新的活跃平台
  setCurrentPlatform(platform)
  
  // 锁定其他平台
  lockOtherPlatforms(platform)
  
  console.log(`\n🎯 现在可以开始开发 ${PLATFORMS[platform].name}`)
  console.log(`💡 开发命令: cd ${PLATFORMS[platform].dir} && ${PLATFORMS[platform].devCommand}`)
}

// 命令行接口
function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  switch (command) {
    case 'switch':
    case 'use':
      const platform = args[1]
      if (!platform) {
        console.error('❌ 请指定要切换的平台')
        console.log('用法: node enforce-single-platform.js switch <platform>')
        console.log('平台选项:', Object.keys(PLATFORMS).join(', '))
        process.exit(1)
      }
      switchTo(platform)
      break
      
    case 'unlock':
    case 'release':
      unlockAllPlatforms()
      break
      
    case 'status':
      showStatus()
      break
      
    case 'check':
      const lockInfo = isPlatformLocked(args[1])
      if (lockInfo) {
        console.log(`🔒 ${PLATFORMS[args[1]].name} 已被锁定`)
        console.log(`锁定原因: ${lockInfo.message}`)
        process.exit(1)
      } else {
        console.log(`✅ ${PLATFORMS[args[1]].name} 可用`)
      }
      break
      
    default:
      console.log('📖 单端开发约束机制')
      console.log('')
      console.log('用法:')
      console.log('  node enforce-single-platform.js switch <platform>  切换到指定平台')
      console.log('  node enforce-single-platform.js status            显示平台状态')
      console.log('  node enforce-single-platform.js unlock            解锁所有平台')
      console.log('  node enforce-single-platform.js check <platform>  检查平台状态')
      console.log('')
      console.log('可用平台:', Object.keys(PLATFORMS).join(', '))
      console.log('')
      console.log('示例:')
      console.log('  node enforce-single-platform.js switch h5')
      console.log('  node enforce-single-platform.js switch miniprogram')
      console.log('  node enforce-single-platform.js unlock')
      break
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  getCurrentPlatform,
  setCurrentPlatform,
  lockOtherPlatforms,
  unlockAllPlatforms,
  isPlatformLocked,
  switchTo,
  PLATFORMS
}
<template>
  <div class="test-login">
    <h1 style="color: red; font-size: 30px; background: yellow; padding: 20px;">测试登录页面 - 你应该能看到这个</h1>
    <p style="color: blue; font-size: 20px; background: white; padding: 10px;">Vue组件渲染正常</p>
    <button @click="testClick" style="padding: 15px 30px; font-size: 18px; background: green; color: white; border: 2px solid black;">点击测试</button>
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,0,0,0.3); z-index: 9999; pointer-events: none;">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border: 3px solid black;">
        强制显示测试内容
      </div>
    </div>
  </div>
</template>

<script setup>
console.log('TestLogin component loaded - 强制内联样式测试')

function testClick() {
  console.log('Test button clicked')
  alert('测试成功! 组件交互正常')
}
</script>

<style scoped>
.test-login {
  position: relative !important;
  padding: 20px !important;
  text-align: center !important;
  background: #f0f0f0 !important;
  min-height: 100vh !important;
  z-index: 10000 !important;
}
</style>
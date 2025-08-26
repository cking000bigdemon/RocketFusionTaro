<template>
  <div class="user-data-page">
    <van-nav-bar
      title="我的数据"
      left-text="返回"
      left-arrow
      @click-left="goBack"
    >
      <template #right>
        <van-icon name="add-o" @click="showAddDialog = true" />
      </template>
    </van-nav-bar>

    <div class="user-data-content">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <van-cell
          v-for="item in list"
          :key="item.id"
          :title="item.name"
          :label="item.description"
          :value="formatDate(item.created_at)"
          is-link
          @click="viewDetail(item)"
        >
          <template #right-icon>
            <van-tag size="mini" :type="getTypeColor(item.data_type)">
              {{ item.data_type }}
            </van-tag>
          </template>
        </van-cell>
      </van-list>
    </div>

    <!-- 添加数据弹窗 -->
    <van-dialog
      v-model:show="showAddDialog"
      title="添加数据"
      show-cancel-button
      @confirm="addData"
    >
      <van-form>
        <van-field
          v-model="form.name"
          label="名称"
          placeholder="请输入数据名称"
          required
        />
        <van-field
          v-model="form.description"
          label="描述"
          placeholder="请输入描述（可选）"
        />
        <van-field
          v-model="form.data_type"
          label="类型"
          placeholder="请输入数据类型"
          required
        />
        <van-field
          v-model="form.content"
          type="textarea"
          label="内容"
          placeholder="请输入数据内容"
          rows="3"
          required
        />
      </van-form>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getRouterHandler } from '../utils/RouterHandler.js'
import apiClient from '@shared/api/ApiClient.js'
import { formatDate } from '@shared/utils/index.js'

const routerHandler = getRouterHandler()

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const showAddDialog = ref(false)

const form = reactive({
  name: '',
  description: '',
  data_type: '',
  content: ''
})

function goBack() {
  routerHandler.platformAdapter.goBack()
}

async function onLoad() {
  // 模拟加载数据
  const response = await apiClient.mobileGetUserData()
  if (response.data) {
    list.value = response.data
  }
  loading.value = false
  finished.value = true
}

function viewDetail(item) {
  console.log('View detail:', item)
}

function getTypeColor(type) {
  const colors = {
    text: 'primary',
    json: 'success',
    image: 'warning',
    file: 'default'
  }
  return colors[type] || 'default'
}

async function addData() {
  try {
    await apiClient.mobileAddUserData(form)
    Object.assign(form, {
      name: '',
      description: '',
      data_type: '',
      content: ''
    })
    await onLoad()
    await routerHandler.platformAdapter.showToast('添加成功', 'success')
  } catch (error) {
    await routerHandler.platformAdapter.showToast('添加失败', 'error')
  }
}

onMounted(() => {
  onLoad()
})
</script>

<style lang="scss" scoped>
.user-data-page {
  min-height: 100vh;
  background-color: #f8f8f8;
}

.user-data-content {
  padding: 16px;
}
</style>
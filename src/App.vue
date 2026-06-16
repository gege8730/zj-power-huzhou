<template>
  <el-config-provider :locale="zhCn">
    <DashboardView />
  </el-config-provider>
</template>

<script setup lang="ts">
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import DashboardView from './views/DashboardView.vue'
</script>

<template>
  <div class="screen-root">
    <div class="dashboard">
      <div class="app-layer" v-if="initData">
        <TopHeader />
        <LeftSidebar :factors="store.factors" :forecast-text="initData.forecastText" :days="initData.forecastDays" />
        <MapStage :title="initData.mapTitle" :query-placeholder="initData.queryPlaceholder" :toolbar="initData.toolbar"
          :active-toolbar="initData.activeToolbar" :layer-groups="initData.layerGroups" :timeline="initData.timeline" />
        <RightSidebar :warning="initData.warning" :similar-days="initData.similarDays"
          :material-tabs="initData.materialTabs" :material-files="initData.materialFiles"
          @preview-material="handlePreviewMaterial" />
        <PdfPreviewDialog
          v-model="pdfPreviewVisible"
          :file="previewFile"
          :files="initData.materialFiles"
          :tabs="initData.materialTabs"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TopHeader from '../components/common/TopHeader.vue'
import LeftSidebar from '../components/left/LeftSidebar.vue'
import MapStage from '../components/center/MapStage.vue'
import RightSidebar from '../components/right/RightSidebar.vue'
import PdfPreviewDialog from '../components/common/PdfPreviewDialog.vue'
import rawMock from '../mock/dashboard.json'
import { onMounted, ref, watch } from 'vue'
import { getTimeList } from '@/api/weather'
import type { DashboardMock, MaterialFile } from '../types/dashboard'
import { ElMessage } from 'element-plus'
import 'element-plus/theme-chalk/el-message.css'
import { useMapStore } from '@/store'
import dayjs from 'dayjs'

const store = useMapStore()
const initData = ref(rawMock as unknown as DashboardMock)
const pdfPreviewVisible = ref(false)
const previewFile = ref<MaterialFile | null>(null)

const handlePreviewMaterial = (file: MaterialFile) => {
  if (!file.pdfUrl && !file.filePath) {
    ElMessage.warning('当前材料暂无可预览 PDF')
    return
  }

  previewFile.value = file
  pdfPreviewVisible.value = true
}
// 时间轴获取
const fetchData = async () => {
  // 判断 ele 参数是否为空字符串
  if (store.timelineParams.ele === '') {
    console.warn('当前要素参数为空，无法获取时间列表')
    store.initTimeline([])
    ElMessage.warning('该要素还在开发中')
    return
  }
  await getTimeList(store.timelineParams).then((response) => {
    const duration = store.currentFactor.eleDuration[store.currentOptionIndex]
    let timeline = response.DS

    // 根据当前选择的要素和时间跨度过滤时间列表
    if (duration === 'H') {
      // 只要整点数据
      timeline = timeline.filter((item: any) => dayjs(item.dateTime).minute() === 0)
    } else if (duration === 'D') {
      // 按天为跨度，取相同小时点的数据（如每天15时）
      if (timeline.length > 0) {
        // 升序排列时用最后一个元素（最新的）
        const latestItem = timeline[timeline.length - 1]
        const targetHour = dayjs(latestItem.dateTime).hour()
        // 过滤出相同小时点的数据
        timeline = timeline.filter((item: any) => dayjs(item.dateTime).hour() === targetHour)
      }
    }
    // 其他跨度（如15MIN、10MIN）不做处理

    initData.value.timeline = timeline
    store.initTimeline(timeline)
  })
}
onMounted(async () => {
  await fetchData()
})
watch(() => store.currentSelection, async (newLabel) => {
  console.log('当前选择的标签:', newLabel, store.timelineParams);
  initData.value.mapTitle = store.maptitle
  await fetchData()
}, { immediate: true });
watch(() => store.maptitle, async (newLabel) => {
  initData.value.mapTitle = newLabel
}, { immediate: true });
</script>

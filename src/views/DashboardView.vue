<template>
  <div class="screen-root">
    <div class="dashboard">
      <div class="app-layer" v-if="initData">
        <TopHeader />
        <LeftSidebar :factors="store.factors" :forecast-text="initData.forecastText" :days="initData.forecastDays" />
        <MapStage :title="initData.mapTitle" :query-placeholder="initData.queryPlaceholder" :toolbar="initData.toolbar"
          :active-toolbar="initData.activeToolbar" :layer-groups="initData.layerGroups" :timeline="initData.timeline" />
        <RightSidebar :warning="initData.warning" :similar-days="initData.similarDays"
          :material-tabs="initData.materialTabs" :material-files="initData.materialFiles" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TopHeader from '../components/common/TopHeader.vue'
import LeftSidebar from '../components/left/LeftSidebar.vue'
import MapStage from '../components/center/MapStage.vue'
import RightSidebar from '../components/right/RightSidebar.vue'
import rawMock from '../mock/dashboard.json'
import { onMounted, ref, watch } from 'vue'
import { getTimeList } from '@/api/weather'
import type { DashboardMock } from '../types/dashboard'
import { useMapStore } from '@/store'
import dayjs from 'dayjs'

const store = useMapStore()
const initData = ref(rawMock as unknown as DashboardMock)
const fetchData = async () => {
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
  await fetchData()
}, { immediate: true });
</script>

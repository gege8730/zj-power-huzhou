<template>
  <div class="screen-root">
    <div class="dashboard">
      <div class="app-layer" v-if="initData">
        <TopHeader/>
        <LeftSidebar
          :factors="store.factors"
          :forecast-text="initData.forecastText"
          :days="initData.forecastDays"
        />
        <MapStage
          :title="initData.mapTitle"
          :query-placeholder="initData.queryPlaceholder"
          :toolbar="initData.toolbar"
          :active-toolbar="initData.activeToolbar"
          :layer-groups="initData.layerGroups"
          :timeline="initData.timeline"
        />
        <RightSidebar
          :warning="initData.warning"
          :similar-days="initData.similarDays"
          :material-tabs="initData.materialTabs"
          :material-files="initData.materialFiles"
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
import rawMock from '../mock/dashboard.json'
import { onMounted,ref } from 'vue'
import {getTimeList,getDataFile} from '@/api/weather'
import type { DashboardMock } from '../types/dashboard'
import { useMapStore } from '@/store'

const store = useMapStore()
const initData =  ref(rawMock as unknown as DashboardMock)
const fetchData = async () => {
  await getTimeList(store.timelineParams).then((response) => {
    initData.value.timeline = response.DS
    store.initTimeline(initData.value.timeline)
  })
}

onMounted( async() => {
  await fetchData()
})
</script>

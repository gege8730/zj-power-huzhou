<template>
  <div class="screen-root">
    <div class="dashboard">
      <div class="app-layer" v-if="mock">
        <TopHeader
          :time="mock.time"
          :date="mock.date"
          :week="mock.week"
          :title="mock.title"
          :help-text="mock.helpText"
        />
        <LeftSidebar
          :factors="store.factors"
          :forecast-text="mock.forecastText"
          :days="mock.forecastDays"
        />
        <MapStage
          :title="mock.mapTitle"
          :query-placeholder="mock.queryPlaceholder"
          :toolbar="mock.toolbar"
          :active-toolbar="mock.activeToolbar"
          :layer-groups="mock.layerGroups"
          :timeline="mock.timeline"
        />
        <RightSidebar
          :warning="mock.warning"
          :similar-days="mock.similarDays"
          :material-tabs="mock.materialTabs"
          :material-files="mock.materialFiles"
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
import type { DashboardMock } from '../types/dashboard'

import { useMapStore } from '@/store'
const store = useMapStore()
const mock =  rawMock as unknown as DashboardMock
</script>

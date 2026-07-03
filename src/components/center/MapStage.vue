<template>
  <main class="map-stage fade-in" v-loading="store.mapRenderData.loading">
    <h2 class="map-title">{{ title }}</h2>
    <div class="weather-icons">
    </div>

    <WeatherWarningNotice />
    <MapControlGroup :groups="layerGroups" />
    <LayerToolbar :items="toolbar" :active="activeToolbar" :query-placeholder="queryPlaceholder" />
    <MapCore class="map-canvas" />
    <TemperatureLegend />
    <div v-if="store.isConvectionMode && store.mapRenderData.convectionData" class="convection-risk-legend">
      <div class="convection-risk-title">风险<br>等级</div>
      <div class="convection-risk-item high">红色风险</div>
      <div class="convection-risk-item middle">黄色风险</div>
      <div class="convection-risk-item low">低风险</div>
    </div>

    <div class="map-bottom-tabs">
      <button class="mini-tab" :class="{ active: store.productMode === 'live' }" type="button" @click="store.setProductMode('live')">☀ 实况</button>
      <button class="mini-tab" :class="{ active: store.productMode === 'forecast' }" type="button" @click="store.setProductMode('forecast')">☁ 预报</button>
      <!-- <div class="datepicker-wrapper">
        <el-date-picker
          v-model="baseTimeModel"
          type="datetime"
          format="YYYY年MM月DD日 HH时"
          date-format="YYYY年MM月DD日"
          time-format="HH时"
          placeholder="选择时间"
          :clearable="false"
        />
      </div> -->
    </div>
    <TimeAxis :timeline="timeline" />
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { LayerGroup } from '../../types/dashboard'
import LayerToolbar from './LayerToolbar.vue'
import MapControlGroup from './MapControlGroup.vue'
import TemperatureLegend from './TemperatureLegend.vue'
import MapCore from './MapCore.vue'
import TimeAxis from './TimeAxis.vue'
import WeatherWarningNotice from './WeatherWarningNotice.vue'
import { useMapStore } from '@/store'

const store = useMapStore()

/** 桥接 Date <-> dayjs，v-model 返回的是 Date 对象 */
const baseTimeModel = computed<Date>({
  get: () => store.baseTime.toDate(),
  set: (val) => {
    if (val) store.baseTime = dayjs(val)
  },
})

const props = defineProps<{
  title: string
  queryPlaceholder: string
  toolbar: string[]
  activeToolbar: string
  layerGroups: LayerGroup[]
  timeline: Array<{ dateTime: string; filePath: string }>
}>()
</script>

<style scoped>
.map-stage {
  grid-column: 2;
  grid-row: 2;
  position: relative;
  min-width: 0;
  min-height: 0;
  height: 100%;
  z-index: 1;
  /* 地图画布顶部压到标题背景下方的距离只跟纵向布局有关，不能跟左右栏收缩的横向 gap 绑定 */
  --map-canvas-offset-y: calc(var(--layout-gap) - 1.15vh);
  transition: width var(--layout-transition), transform var(--layout-transition);
}

.map-stage :deep(.control-groups),
.map-stage :deep(.layer-toolbar),
.map-stage :deep(.time-axis),
.map-stage :deep(.map-bottom-tabs),
.map-stage :deep(.radar-time-switch),
.map-stage :deep(.electric-line-legend) {
  transition: left var(--layout-transition), right var(--layout-transition), width var(--layout-transition), transform var(--layout-transition), opacity var(--layout-transition);
}

.convection-risk-legend {
  position: absolute;
  right: 1.7%;
  top: 36%;
  z-index: 7;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: clamp(1.45rem, 1.5vw, 1.85rem);
  color: #fff;
  font-weight: 800;
  font-size: clamp(0.72rem, 0.78vw, 0.9rem);
  line-height: 1.05;
  text-align: center;
  text-shadow: 0 0 0.32rem rgba(0, 12, 32, 0.86);
}

.convection-risk-title {
  margin-bottom: 0.28rem;
}

.convection-risk-item {
  min-height: clamp(3.2rem, 8vh, 4.65rem);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.22rem 0.12rem;
  writing-mode: vertical-rl;
  letter-spacing: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
}

.convection-risk-item.high {
  background: #f14b57;
}

.convection-risk-item.middle {
  color: #3b3412;
  background: #ffda5a;
  text-shadow: none;
}

.convection-risk-item.low {
  background: #52cf93;
}

.map-title {
  position: absolute;
  top: 0.4%;
  left: 18%;
  right: 13%;
  margin: 0;
  text-align: center;
  color: #fff;
  font-size: clamp(1.35rem, 1.15vw, 1.95rem);
  line-height: 1.35;
  font-weight: 750;
  letter-spacing: 0.05em;
  z-index: 5;
}

.weather-icons {
  position: absolute;
  right: 13%;
  top: 3%;
  display: flex;
  gap: 0.5rem;
  z-index: 7;
}

.warn-icon {
  width: clamp(2.65rem, 2.5vw, 3.2rem);
  aspect-ratio: 0.88;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid #dbeeff;
  color: #f6ff30;
  font-size: clamp(1.25rem, 1.35vw, 1.75rem);
  background: linear-gradient(180deg, rgba(250, 244, 72, 0.84), rgba(24, 144, 205, 0.76));
  box-shadow: 0 0 0.5rem rgba(254, 246, 85, 0.65);
}

.warn-icon small {
  font-size: 0.62rem;
  color: #fff;
  letter-spacing: 0;
}

.map-canvas {
  position: absolute;
  width: calc(100vw);
  height: calc(100% + var(--edge-bottom) + var(--map-canvas-offset-y));
  left: calc((var(--layout-side-current, var(--side-w)) + var(--layout-gap-current, var(--layout-gap)) + var(--edge-x))*-1);
  top: calc(-1 * var(--map-canvas-offset-y));
  z-index: 1;
  transition: left var(--layout-transition), top var(--layout-transition), width var(--layout-transition), height var(--layout-transition);
}

.map-vignette {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(5, 18, 34, 0.3), transparent 20%, transparent 80%, rgba(5, 18, 34, 0.36)),
    linear-gradient(180deg, rgba(2, 15, 30, 0.28), transparent 36%, rgba(2, 15, 30, 0.24));
  z-index: 3;
}

.changxing {
  left: 45%;
  top: 25%;
}

.huzhou {
  left: 60%;
  top: 42%;
}

.anji {
  left: 31%;
  top: 59%;
}

.deqing {
  left: 55%;
  top: 71%;
}

.map-bottom-tabs {
  position: absolute;
  left: 0;
  bottom: 7.2%;
  display: flex;
  gap: 0.6rem;
  z-index: 7;
}

.mini-tab {
  height: clamp(1.8rem, 2.4vh, 1.8rem);
  min-width: 6.2rem;
  padding: 0 0.75rem;
  border: 1px solid rgba(31, 173, 255, 0.664);
  border-radius: 0.25rem;
  color: #dff8ff;
  font-size: clamp(0.68rem, 0.7vw, 0.85rem);
  font-weight: 500;
  background-image: url('../../assets/bottom-button.png');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  cursor: pointer;
}

.mini-tab.active {
  color: #ffe343;
  background-image: url('../../assets/bottom-button_active.png');
}

.datepicker-wrapper {
  min-width: 11.8rem;
  background: rgba(0, 57, 103, .9);
  border: 1px solid #336ec799;
  border-radius: 4px;
  padding: 2px;
}

.datepicker-wrapper :deep(*) {
  background: rgba(0, 57, 103, .9) !important;
  background-color: rgba(0, 57, 103, .9) !important;
}

.datepicker-wrapper :deep(.el-input__wrapper) {
  border: none !important;
  box-shadow: none !important;
}

.datepicker-wrapper :deep(.el-input__inner) {
  color: #dff8ff !important;
}

/* loading 遮罩半透明 */
:deep(.el-loading-mask) {
  background-color: rgba(0, 30, 60, 0.411) !important;
}
</style>

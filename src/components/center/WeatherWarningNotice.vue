<template>
  <div v-if="warningStore.sortedWarnings.length" class="warning-notice" :class="noticePositionClass">
    <div v-if="warningStore.sortedWarnings.length <= 2" class="warning-page">
      <button
        v-for="item in warningStore.sortedWarnings"
        :key="item.identifier || item.info?.headline"
        class="warning-icon"
        type="button"
        :title="item.info?.headline || item.display_type_name"
        @click="warningStore.openWarning(item)"
      >
        <img :src="item.icon_url || item.icon_url2" :alt="item.display_type_name || item.info?.disaName || '预警'" />
      </button>
    </div>

    <el-carousel
      v-else
      class="warning-carousel"
      direction="horizontal"
      height="clamp(2.15rem, 3.2vh, 2.75rem)"
      indicator-position="none"
      arrow="never"
      :interval="3600"
      autoplay
    >
      <el-carousel-item v-for="(page, pageIndex) in warningStore.warningPages" :key="pageIndex">
        <div class="warning-page">
          <button
            v-for="item in page"
            :key="item.identifier || item.info?.headline"
            class="warning-icon"
            type="button"
            :title="item.info?.headline || item.display_type_name"
            @click="warningStore.openWarning(item)"
          >
            <img :src="item.icon_url || item.icon_url2" :alt="item.display_type_name || item.info?.disaName || '预警'" />
          </button>
        </div>
      </el-carousel-item>
    </el-carousel>
  </div>

  <el-dialog
    v-model="warningStore.dialogVisible"
    class="weather-warning-dialog"
    width="58vw"
    :show-close="true"
    :close-on-click-modal="false"
    append-to-body
  >
    <template #header>
      <div class="warning-dialog-title">预警信号详情</div>
    </template>
    <div class="warning-dialog-body" v-if="warningStore.currentWarning">
      <aside class="warning-list">
        <div class="warning-list-title">预警列表</div>
        <button
          v-for="(item, index) in warningStore.sortedWarnings"
          :key="item.identifier || index"
          class="warning-list-item"
          :class="{ active: item.identifier === warningStore.currentWarning.identifier }"
          type="button"
          @click="warningStore.openWarning(item)"
        >
          <span class="warning-rank">{{ index + 1 }}</span>
          <img :src="item.icon_url || item.icon_url2" alt="" />
          <span class="warning-name">{{ item.info?.headline || item.display_type_name || '气象预警' }}</span>
          <span class="warning-time">{{ formatTime(item.sendTime || item.info?.effective) }}</span>
        </button>
      </aside>
      <section class="warning-detail">
        <div class="warning-detail-head">
          <img :src="warningStore.currentWarning.icon_url || warningStore.currentWarning.icon_url2" alt="" />
          <div>
            <h3>{{ warningStore.currentWarning.info?.headline || warningStore.currentWarning.display_type_name || '气象预警' }}</h3>
            <p>{{ formatTime(warningStore.currentWarning.sendTime || warningStore.currentWarning.info?.effective) }}</p>
          </div>
        </div>

        <div class="detail-row">
          <span>发布单位</span>
          <p>{{ warningStore.currentWarning.sender || '-' }}</p>
        </div>
        <div class="detail-row">
          <span>影响区域</span>
          <p>{{ warningStore.currentWarning.info?.area?.areaDesc || '-' }}</p>
        </div>
        <div class="detail-row">
          <span>预警内容</span>
          <p>{{ warningStore.currentWarning.info?.description || warningStore.currentWarning.code?.method?.[0]?.message || '-' }}</p>
        </div>
        <div class="detail-row">
          <span>防御指南</span>
          <p class="multiline">{{ warningStore.currentWarning.info?.defences || warningStore.currentWarning.info?.instruction || '-' }}</p>
        </div>
      </section>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import { useLayerToolbarStore, useWarningStore } from '@/store'

const warningStore = useWarningStore()
const layerStore = useLayerToolbarStore()

const layerTimeRowCount = computed(() => {
  let count = 0
  if (layerStore.isRadarActive && layerStore.radarImages.length > 0) count += 1
  if (layerStore.isElectricLineActive && layerStore.currentElectricLineLabel) count += 1
  if (layerStore.isLightningActive && layerStore.currentLightningLabel) count += 1
  return count
})

const noticePositionClass = computed(() => ({
  'below-one-layer-time': layerTimeRowCount.value === 1,
  'below-two-layer-times': layerTimeRowCount.value >= 2,
  'below-three-layer-times': layerTimeRowCount.value >= 3,
}))

onMounted(() => {
  warningStore.loadWarnings()
})

function formatTime(time?: string) {
  if (!time) return ''
  const value = dayjs(String(time).replace('+08:00', ''))
  return value.isValid() ? value.format('YYYY-MM-DD HH:mm') : time
}
</script>

<style scoped>
.warning-notice {
  position: absolute;
  right: 0;
  top: clamp(2.7rem, 4.7vh, 5.1rem);
  width: clamp(5.6rem, 6.6vw, 8rem);
  height: clamp(3rem, 3.2vh, 2.75rem);
  z-index: 8;
  transition: top 0.18s ease;
}

.warning-notice.below-one-layer-time {
  top: clamp(5rem, 8.2vh, 7.9rem);
}

.warning-notice.below-two-layer-times {
  top: clamp(7.65rem, 12.4vh, 11.2rem);
}

.warning-notice.below-three-layer-times {
  top: clamp(10.3rem, 16.6vh, 14.9rem);
}

.warning-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: clamp(0.35rem, 0.45vw, 0.55rem);
}

.warning-icon {
  width: clamp(2.15rem, 2.3vw, 2.75rem);
  height: clamp(2.15rem, 2.3vw, 2.75rem);
  padding: 0;
  border: 1px solid rgba(255, 230, 83, 0.8);
  border-radius: 0.18rem;
  background: rgba(0, 57, 103, 0.78);
  box-shadow: 0 0 0.6rem rgba(255, 214, 66, 0.38);
  cursor: pointer;
  overflow: hidden;
}

.warning-icon img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.warning-carousel,
.warning-carousel :deep(.el-carousel__container) {
  height: 100% !important;
}
</style>

<style>
.weather-warning-dialog.el-dialog {
  background: linear-gradient(180deg, rgba(3, 44, 97, 0.98), rgba(0, 24, 65, 0.98)) !important;
  border: 1px solid rgba(73, 184, 255, 0.55);
  box-shadow: 0 0 2rem rgba(0, 120, 255, 0.35);
}

.weather-warning-dialog .el-dialog__header {
  padding: 0.85rem 1rem;
  margin: 0;
  border-bottom: 1px solid rgba(81, 174, 255, 0.3);
}

.weather-warning-dialog .el-dialog__body {
  padding: 0;
}

.weather-warning-dialog .el-dialog__headerbtn .el-dialog__close {
  color: #dff8ff;
}

.warning-dialog-title {
  color: #dff8ff;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.warning-dialog-body {
  height: min(58vh, 33rem);
  display: grid;
  grid-template-columns: 36% 1fr;
  color: #e6f8ff;
}

.warning-list {
  padding: 0.8rem;
  border-right: 1px solid rgba(81, 174, 255, 0.28);
  overflow-y: auto;
}

.warning-list-title {
  margin-bottom: 0.55rem;
  color: #fff381;
  font-weight: 700;
}

.warning-list-item {
  width: 100%;
  min-height: 3rem;
  display: grid;
  grid-template-columns: 1.3rem 2rem 1fr;
  grid-template-rows: 1fr 1fr;
  align-items: center;
  column-gap: 0.45rem;
  margin-bottom: 0.45rem;
  padding: 0.35rem 0.45rem;
  border: 1px solid rgba(55, 159, 255, 0.28);
  background: rgba(0, 66, 130, 0.55);
  color: #dff8ff;
  text-align: left;
  cursor: pointer;
}

.warning-list-item.active,
.warning-list-item:hover {
  border-color: rgba(255, 227, 62, 0.75);
  background: rgba(19, 112, 207, 0.72);
}

.warning-rank {
  grid-row: 1 / span 2;
  color: #fff381;
  text-align: center;
}

.warning-list-item img {
  grid-row: 1 / span 2;
  width: 2rem;
  height: 2rem;
  object-fit: cover;
}

.warning-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.82rem;
}

.warning-time {
  color: rgba(223, 248, 255, 0.7);
  font-size: 0.72rem;
}

.warning-detail {
  padding: 1rem 1.2rem;
  overflow-y: auto;
}

.warning-detail-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.warning-detail-head img {
  width: 3rem;
  height: 3rem;
  object-fit: cover;
  border: 1px solid rgba(255, 227, 62, 0.55);
}

.warning-detail-head h3 {
  margin: 0 0 0.35rem;
  color: #fff381;
  font-size: 1.05rem;
}

.warning-detail-head p {
  margin: 0;
  color: rgba(223, 248, 255, 0.72);
}

.detail-row {
  display: grid;
  grid-template-columns: 5rem 1fr;
  gap: 0.7rem;
  margin-bottom: 0.75rem;
  line-height: 1.7;
}

.detail-row span {
  color: #76d8ff;
  font-weight: 700;
}

.detail-row p {
  margin: 0;
}

.detail-row .multiline {
  white-space: pre-line;
}
</style>

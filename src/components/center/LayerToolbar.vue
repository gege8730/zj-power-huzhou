<template>
  <div class="layer-toolbar">
    <!-- <button class="query neon-border" type="button">
      {{ queryPlaceholder }}
      <span class="search-icon">⌕</span>
    </button> -->
    <button
      v-for="item in items"
      :key="item"
      class="tool-item"
      :class="{ active: layerStore.resolveToolbarKey(item) === layerStore.activeKey }"
      type="button"
      @click="layerStore.handleToolbarClick(item)"
    >
      {{ item }}
    </button>
  </div>

  <div v-if="layerStore.isRadarActive && layerStore.radarImages.length" class="radar-time-switch">
    <button
        class="time-arrow"
        type="button"
        :disabled="layerStore.radarIndex <= 0"
        @click="layerStore.prevRadar"
      >
        <ArrowLeftBold />
      </button>
      <span class="time-label">{{ beijingTimeLabel }}</span>
      <button
        class="time-arrow"
        type="button"
        :disabled="layerStore.radarIndex >= layerStore.radarImages.length - 1"
        @click="layerStore.nextRadar"
      >
        <ArrowRightBold />
      </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeftBold, ArrowRightBold } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useLayerToolbarStore } from '@/store'

defineProps<{
  items: string[]
  active: string
  queryPlaceholder: string
}>()

const layerStore = useLayerToolbarStore()

const beijingTimeLabel = computed(() => {
  const utcLabel = layerStore.currentRadarLabel
  if (!utcLabel) return ''
  const match = utcLabel.match(/(\d{2})日(\d{2})时(\d{2})分雷达/)
  if (!match) return utcLabel
  const [, day, hour, minute] = match
  const beijingTime = dayjs().date(parseInt(day)).hour(parseInt(hour)).minute(parseInt(minute)).add(8, 'hour')
  return `${beijingTime.format('DD日HH时mm分')}雷达`
})
</script>

<style scoped>
.layer-toolbar {
  position: absolute;
  left: 0;
  top: 42%;
  width: clamp(8.5rem, 10.7vw, 10.2rem);
  display: flex;
  flex-direction: column;
  gap: clamp(0.45rem, 1vh, 0.7rem);
  z-index: 4;
}

.tool-item {
  height: clamp(2.65rem, 4.6vh, 3.4rem);
  width: 100%;
  border: 0;
  color: #e7f8ff;
  font-size: clamp(0.9rem, 0.95vw, 1.15rem);
  font-weight: 500;
  text-align: left;
  background: url('../../assets/pick.png');
  background-repeat: no-repeat;
  background-size: 100% 100%;
  cursor: pointer;
  position: relative;
  padding: 0 0 0 30%;
  display: flex;
  align-items: center;
  font-family: inherit;
}

.tool-item:hover {
  color: #fff9c7;
}

.tool-item:focus-visible {
  outline: 1px solid rgba(255, 227, 62, 0.8);
  outline-offset: -0.2rem;
}

.query {
  padding: 0 0.7rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: clamp(0.8rem, 0.84vw, 1rem);
  letter-spacing: 0;
}

.search-icon {
  font-size: clamp(1.25rem, 1.25vw, 1.55rem);
  opacity: 0.9;
}

.active {
  background: url('../../assets/active_pick.png');
  color: #ffc700;
  background-repeat: no-repeat;
  background-size: 100% 100%;
}

.radar-time-switch {
  position: absolute;
  right: 0;
  top: clamp(2.7rem, 4.7vh, 5.1rem);
  min-width: clamp(10.6rem, 12vw, 14rem);
  height: clamp(2rem, 3vh, 2.35rem);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(0.45rem, 0.6vw, 0.65rem);
  padding: 0 clamp(0.55rem, 0.8vw, 0.85rem);
  background: linear-gradient(90deg, rgba(0, 57, 103, 0.24), rgba(12, 120, 212, 0.92), rgba(0, 57, 103, 0.24));
  border: 1px solid rgba(49, 200, 255, 0.32);
  box-shadow:
    inset 0 0 0.75rem rgba(49, 200, 255, 0.22),
    0 0 1rem rgba(12, 120, 212, 0.26);
  color: #dff8ff;
  font-size: clamp(0.82rem, 0.88vw, 1.08rem);
  font-weight: 500;
  text-shadow: 0 0 0.45rem rgba(49, 200, 255, 0.72);
  white-space: nowrap;
  z-index: 8;
}

.time-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(1.4rem, 1.6vw, 1.7rem);
  height: 100%;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: clamp(1.5rem, 1.6vw, 1.8rem);
  cursor: pointer;
  text-shadow: 0 0 0.3rem rgba(255, 255, 255, 0.8);
}

.time-arrow:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.time-label {
  flex: 1;
  text-align: center;
  letter-spacing: 0.03em;
}
</style>

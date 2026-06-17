<template>
  <div class="layer-toolbar">
    <!-- <button class="query neon-border" type="button">
      {{ queryPlaceholder }}
      <span class="search-icon">⌕</span>
    </button> -->
    <div
      v-for="item in items"
      :key="item"
      class="tool-wrapper"
      @mouseenter="handleToolMouseEnter(item)"
      @mouseleave="handleToolMouseLeave(item)"
    >
      <button
        class="tool-item"
        :class="{ active: layerStore.isToolbarActive(layerStore.resolveToolbarKey(item)), disabled: isDisabledItem(item) }"
        type="button"
        :disabled="isDisabledItem(item)"
        @click="layerStore.handleToolbarClick(item)"
      >
        {{ item }}
      </button>

      <div
        v-if="isElectricLineItem(item) && electricLineMenuVisible"
        class="electric-line-submenu"
        @mouseenter="electricLineMenuVisible = true"
        @click.stop
      >
        <button
          class="electric-line-option tower-option"
          type="button"
          :class="{ checked: layerStore.electricLineTowerChecked }"
          @click.stop="layerStore.toggleElectricLineTower"
        >
          <span class="line-checkbox" :class="{ checked: layerStore.electricLineTowerChecked }"></span>
          <span>杆塔</span>
        </button>
        <div class="electric-line-option-divider"></div>
        <button
          v-for="option in layerStore.electricLineCategoryOptions"
          :key="option.key"
          class="electric-line-option"
          type="button"
          :class="{ checked: layerStore.isElectricLineCategoryChecked(option.key) }"
          @click.stop="layerStore.toggleElectricLineCategory(option.key)"
        >
          <span class="line-checkbox" :class="{ checked: layerStore.isElectricLineCategoryChecked(option.key) }"></span>
          <span>{{ option.label }}</span>
        </button>
      </div>
    </div>
  </div>

  <div v-if="layerStore.isRadarActive && layerStore.radarImages.length" class="radar-time-switch radar-time">
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

  <div
    v-if="layerStore.isElectricLineActive && layerStore.currentElectricLineLabel"
    class="radar-time-switch electric-line-time"
    :class="{ 'below-radar-time': layerStore.isRadarActive && layerStore.radarImages.length }"
  >
    <span class="time-label">{{ layerStore.currentElectricLineLabel }}</span>
  </div>

  <div v-if="layerStore.electricLineLegendVisible" class="electric-line-legend">
    <div class="electric-line-legend-title">输电线路图例</div>
    <div class="electric-line-legend-row">
      <span class="legend-swatch icing"></span>
      <span>覆冰</span>
    </div>
    <div class="electric-line-legend-row">
      <span class="legend-swatch normal"></span>
      <span>未覆冰</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeftBold, ArrowRightBold } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useLayerToolbarStore } from '@/store'

defineProps<{
  items: string[]
  active: string
  queryPlaceholder: string
}>()

const layerStore = useLayerToolbarStore()
const electricLineMenuVisible = ref(false)

const beijingTimeLabel = computed(() => {
  const utcLabel = layerStore.currentRadarLabel
  if (!utcLabel) return ''
  const match = utcLabel.match(/(\d{2})日(\d{2})时(\d{2})分雷达/)
  if (!match) return utcLabel
  const [, day, hour, minute] = match
  const beijingTime = dayjs().date(parseInt(day)).hour(parseInt(hour)).minute(parseInt(minute)).add(8, 'hour')
  return `${beijingTime.format('DD日HH时mm分')}雷达`
})

const isElectricLineItem = (name: string) => layerStore.resolveToolbarKey(name) === 'line'
const isDisabledItem = (name: string) => layerStore.resolveToolbarKey(name) === 'lightning'

const handleToolMouseEnter = (name: string) => {
  if (isElectricLineItem(name)) {
    electricLineMenuVisible.value = true
  }
}

const handleToolMouseLeave = (name: string) => {
  if (isElectricLineItem(name)) {
    electricLineMenuVisible.value = false
  }
}
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
  z-index: 60;
  pointer-events: auto;
}

.tool-wrapper {
  position: relative;
  width: 100%;
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

.tool-item.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.electric-line-submenu {
  position: absolute;
  left: 100%;
  top: 0;
  width: clamp(8.4rem, 9.2vw, 10.8rem);
  padding: clamp(0.45rem, 0.72vh, 0.6rem);
  display: flex;
  flex-direction: column;
  gap: clamp(0.35rem, 0.58vh, 0.5rem);
  background: rgba(0, 57, 103, 0.9);
  border-top-left-radius: .37037037vh;
  border-top-right-radius: .37037037vh;
  border-bottom-left-radius: .20833333vw;
  border-bottom-right-radius: .20833333vw;
  border: 1px solid #336ec799;
  box-shadow: inset 1px 0 #67a3ff;
  box-sizing: border-box;
  z-index: 80;
  pointer-events: auto;
}

.electric-line-option {
  width: 100%;
  min-height: clamp(1.55rem, 2.35vh, 1.9rem);
  padding: 0 clamp(0.35rem, 0.45vw, 0.5rem);
  display: flex;
  align-items: center;
  gap: 0.42rem;
  border: 1px solid rgba(50, 166, 255, 0.24);
  border-radius: 0.16rem;
  color: #d8f2ff;
  background: rgba(0, 40, 86, 0.62);
  font-size: clamp(0.68rem, 0.68vw, 0.82rem);
  text-align: left;
  cursor: pointer;
}

.electric-line-option-divider {
  height: 1px;
  margin: 0.08rem 0;
  background: rgba(103, 163, 255, 0.26);
}

.electric-line-option:hover,
.electric-line-option.checked {
  color: #fff9c7;
  background: rgba(17, 118, 200, 0.7);
  border-color: rgba(93, 214, 255, 0.62);
}

.line-checkbox {
  position: relative;
  width: 0.78rem;
  height: 0.78rem;
  flex: 0 0 0.78rem;
  border: 1px solid #1dbdff;
  background: rgba(0, 42, 89, 0.8);
}

.line-checkbox.checked {
  background: #1295ff;
}

.line-checkbox.checked::after {
  content: "✓";
  position: absolute;
  left: 0.05rem;
  top: -0.35rem;
  font-size: 0.95rem;
  color: #fff;
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

.electric-line-time {
  min-width: clamp(11.6rem, 13vw, 15.5rem);
  color: #fff5c7;
}

.electric-line-time.below-radar-time {
  top: clamp(5rem, 8.3vh, 7.8rem);
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

.electric-line-legend {
  position: absolute;
  right: 1.2%;
  bottom: clamp(3.3rem, 6.9vh, 4.9rem);
  min-width: clamp(8.2rem, 8.4vw, 10.2rem);
  padding: clamp(0.55rem, 0.85vh, 0.76rem) clamp(0.62rem, 0.78vw, 0.9rem);
  background: rgba(0, 57, 103, 0.9);
  border-top-left-radius: .37037037vh;
  border-top-right-radius: .37037037vh;
  border-bottom-left-radius: .20833333vw;
  border-bottom-right-radius: .20833333vw;
  border: 1px solid #336ec799;
  box-shadow: inset 1px 0 #67a3ff;
  box-sizing: border-box;
  color: #e7f8ff;
  z-index: 8;
}

.electric-line-legend-title {
  margin-bottom: clamp(0.35rem, 0.55vh, 0.5rem);
  color: #fff;
  font-size: clamp(0.72rem, 0.74vw, 0.88rem);
  font-weight: 800;
  letter-spacing: 0.05em;
  text-shadow: none;
}

.electric-line-legend-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  height: clamp(1.35rem, 2vh, 1.6rem);
  font-size: clamp(0.68rem, 0.7vw, 0.86rem);
  white-space: nowrap;
}

.legend-swatch {
  width: clamp(1.45rem, 1.6vw, 1.9rem);
  height: 0.24rem;
  border-radius: 999px;
  box-shadow: none;
}

.legend-swatch.icing {
  color: rgb(255, 0, 0);
  background: rgb(255, 0, 0);
}

.legend-swatch.normal {
  color: rgb(60, 255, 250);
  background: rgb(60, 255, 250);
}
</style>

<template>
  <div v-if="legendItems.length" class="legend-wrap">
    <div class="legend-unit">{{ legendUnit }}</div>
    <div class="legend-body">
      <div class="legend-labels">
        <span v-for="(item, index) in legendItems" :key="index">{{ item.displayValue }}</span>
      </div>
      <div class="legend-bar">
        <span
          v-for="item in legendItems"
          :key="`${item.value}-${item.color}`"
          class="legend-color"
          :style="{ backgroundColor: item.color }"
        ></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMapStore } from '@/store'

const store = useMapStore()

const legendItems = computed(() => {
  const stops = store.mapRenderData.colorConfig?.stops || []
  return [...stops]
    .sort((a, b) => b.value - a.value)
    .map((item) => ({
      ...item,
      displayValue: item.value === -999999 ? '' : formatValue(item.value),
    }))
})

const legendUnit = computed(() => store.mapRenderData.colorConfig?.unit || '')

const formatValue = (value: number) => Number.isInteger(value) ? String(value) : String(value).replace(/\.0+$/, '')
</script>

<style scoped>
.legend-wrap {
  position: absolute;
  right: 1.2%;
  top: 20.2%;
  width: clamp(3.35rem, 3.75vw, 4.35rem);
  height: 50%;
  z-index: 6;
  padding: clamp(0.45rem, 0.7vh, 0.7rem) clamp(0.38rem, 0.45vw, 0.55rem);
  /* background: linear-gradient(180deg, rgba(3, 43, 104, 0.92), rgba(4, 31, 82, 0.95));
  border: 1px solid rgba(56, 152, 238, 0.35);
  box-shadow: inset 0 0 1.1rem rgba(44, 132, 226, 0.22), 0 0 0.9rem rgba(0, 18, 45, 0.45); */
  box-sizing: border-box;
}

.legend-unit {
  position: absolute;
  top: clamp(0.15rem, 0.25vh, 0.32rem);
  right: clamp(0.38rem, 0.45vw, 0.55rem);
  font-size: clamp(0.62rem, 0.62vw, 0.75rem);
  color: #dff7ff;
  font-weight: 800;
  text-shadow: 0 0 0.35rem rgba(52, 187, 255, 0.55);
}

.legend-body {
  height: 100%;
  display: grid;
  grid-template-columns: 1fr clamp(0.55rem, 0.7vw, 0.82rem);
  gap: clamp(0.22rem, 0.32vw, 0.38rem);
  padding-top: clamp(0.7rem, 1.05vh, 0.95rem);
  box-sizing: border-box;
}

.legend-labels {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: right;
  font-size: clamp(0.68rem, 0.68vw, 0.82rem);
  line-height: 1;
  font-weight: 800;
  color: #f4fbff;
  text-shadow: 0 0 0.25rem #00112c;
}

.legend-bar {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(4, 19, 51, 0.58);
  box-shadow: 0 0 0.42rem rgba(60, 177, 255, 0.16);
}

.legend-color {
  flex: 1 1 0;
  min-height: 0;
  border-bottom: 1px solid rgba(0, 20, 55, 0.48);
}

.legend-color:last-child {
  border-bottom: none;
}
</style>

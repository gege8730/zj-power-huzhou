<template>
  <main class="map-stage fade-in">
    <h2 class="map-title">{{ title }}</h2>
    <div class="weather-icons">
    </div>

    <MapControlGroup :groups="layerGroups" />
    <LayerToolbar :items="toolbar" :active="activeToolbar" :query-placeholder="queryPlaceholder" />
    <MapCore class="map-canvas" />
    <TemperatureLegend />

    <div class="map-bottom-tabs">
      <button class="mini-tab active" type="button">☀ 实况</button>
      <button class="mini-tab" type="button">☁ 预报</button>
      <button class="mini-tab wide" type="button">▣ 2026年04月15日15时</button>
    </div>
    <TimeAxis :timeline="timeline" />
  </main>
</template>

<script setup lang="ts">
import type { LayerGroup } from '../../types/dashboard'
import LayerToolbar from './LayerToolbar.vue'
import MapControlGroup from './MapControlGroup.vue'
import TemperatureLegend from './TemperatureLegend.vue'
import MapCore from './MapCore.vue'
import TimeAxis from './TimeAxis.vue'

const props = defineProps<{
  title: string
  queryPlaceholder: string
  toolbar: string[]
  activeToolbar: string
  layerGroups: LayerGroup[]
  timeline:  Array<{ dateTime: string; filePath: string }>
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
  height: calc(100% + var(--edge-bottom) + (var(--layout-gap) - 1.15vh));
  left: calc((var(--side-w) + var(--layout-gap) + var(--edge-x))*-1);
  top: calc((var(--layout-gap) - 1.15vh)*-1);
  z-index: 1;
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
  gap: 0.5rem;
  z-index: 7;
}

.mini-tab {
  height: clamp(1.45rem, 2.4vh, 1.8rem);
  min-width: 5.6rem;
  padding: 0 0.75rem;
  border: 1px solid rgba(31, 172, 255, 0.84);
  border-radius: 0.25rem;
  color: #dff8ff;
  font-size: clamp(0.68rem, 0.7vw, 0.85rem);
  font-weight: 800;
  background: linear-gradient(180deg, rgba(9, 106, 203, 0.92), rgba(4, 66, 143, 0.9));
  box-shadow: inset 0 0 0.65rem rgba(114, 219, 255, 0.2);
}

.mini-tab.active {
  color: #ffe343;
}

.mini-tab.wide {
  min-width: 11.8rem;
}
</style>

<template>
  <main class="map-stage fade-in">
    <h2 class="map-title glow-text">{{ title }}</h2>
    <div class="weather-icons">
      <div class="warn-icon lightning">⚡<small>雷电</small></div>
      <div class="warn-icon rain">☁<small>暴雨</small></div>
    </div>

    <LayerToolbar :items="toolbar" :active="activeToolbar" :query-placeholder="queryPlaceholder" />
    <MapControlGroup :groups="layerGroups" />

    <div class="map-canvas">
      <img :src="mapImage" alt="湖州气温分布图" class="map-image" />
      <div class="map-vignette"></div>
      <div class="map-marker changxing">22.3<br />长兴</div>
      <div class="map-marker huzhou">21.3<br />湖州</div>
      <div class="map-marker anji">20.8<br />安吉</div>
      <div class="map-marker deqing">21.1<br />德清</div>
    </div>

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
import mapImage from '../../assets/huzhou-map-placeholder.png'
import LayerToolbar from './LayerToolbar.vue'
import MapControlGroup from './MapControlGroup.vue'
import TemperatureLegend from './TemperatureLegend.vue'
import TimeAxis from './TimeAxis.vue'

defineProps<{
  title: string
  queryPlaceholder: string
  toolbar: string[]
  activeToolbar: string
  layerGroups: LayerGroup[]
  timeline: string[]
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
}

.map-title {
  position: absolute;
  top: 0.4%;
  left: 18%;
  right: 13%;
  margin: 0;
  text-align: center;
  color: #fff;
  font-size: clamp(1.45rem, 1.45vw, 1.95rem);
  line-height: 1.35;
  font-weight: 900;
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
  inset: 5.5% 2.5% 8.4% 15.5%;
  overflow: hidden;
  border-radius: 0.38rem;
}

.map-canvas::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 52%, rgba(255, 212, 92, 0.08), transparent 42%),
    radial-gradient(circle at 75% 15%, rgba(77, 179, 255, 0.12), transparent 30%);
  pointer-events: none;
  z-index: 2;
}

.map-image {
  position: absolute;
  left: 50%;
  top: 52%;
  width: min(90%, 52rem);
  height: 86%;
  object-fit: contain;
  transform: translate(-50%, -50%);
  opacity: 0.98;
}

.map-vignette {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(5, 18, 34, 0.3), transparent 20%, transparent 80%, rgba(5, 18, 34, 0.36)),
    linear-gradient(180deg, rgba(2, 15, 30, 0.28), transparent 36%, rgba(2, 15, 30, 0.24));
  z-index: 3;
}

.map-marker {
  position: absolute;
  z-index: 4;
  min-width: 2.4rem;
  color: #f8ffff;
  font-size: clamp(0.68rem, 0.68vw, 0.82rem);
  line-height: 1.16;
  font-weight: 900;
  text-align: center;
  text-shadow: 0 0.06rem 0.2rem #001322, 0 0 0.25rem #001322;
}

.map-marker::before {
  content: "";
  display: block;
  width: 0.45rem;
  height: 0.45rem;
  margin: 0 auto 0.08rem;
  border-radius: 50%;
  background: #38ff5f;
  box-shadow: 0 0 0.45rem rgba(84, 255, 110, 0.9);
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

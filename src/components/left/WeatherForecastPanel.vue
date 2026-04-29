<template>
  <BasePanel title="天气预报" class-name="weather-forecast" body-class="forecast-body">
    <div class="sub-title-row">短期预报</div>
    <p class="forecast-text">{{ forecastText }}</p>

    <div class="sub-title-row seven-title">七天预报</div>
    <div class="days-grid">
      <div v-for="day in days" :key="day.date" class="day-card">
        <div class="week">{{ day.week }}</div>
        <div class="date">{{ day.date }}</div>
        <div class="icon">{{ day.icon }}</div>
        <div class="weather">{{ day.weather }}</div>
      </div>
    </div>

    <div class="temp-chart">
      <svg viewBox="0 0 390 102" preserveAspectRatio="none" aria-label="七天气温趋势">
        <polyline :points="highPoints" class="line high" />
        <polyline :points="lowPoints" class="line low" />
        <g v-for="(point, index) in highCoords" :key="`h-${index}`">
          <circle :cx="point.x" :cy="point.y" r="3" class="point high-point" />
          <text :x="point.x" :y="point.y - 9" text-anchor="middle" class="temp-label">{{ days[index].high }}℃</text>
        </g>
        <g v-for="(point, index) in lowCoords" :key="`l-${index}`">
          <circle :cx="point.x" :cy="point.y" r="3" class="point low-point" />
          <text :x="point.x" :y="point.y + 19" text-anchor="middle" class="temp-label">{{ days[index].low }}℃</text>
        </g>
      </svg>
    </div>

    <div class="days-grid wind-grid">
      <div v-for="day in days" :key="`${day.date}-wind`" class="wind-card">
        <div class="night-icon">{{ day.icon === '☀' ? '🌙' : day.icon }}</div>
        <div>{{ day.weather }}</div>
        <div>{{ day.wind }}</div>
        <div>{{ day.level }}</div>
      </div>
    </div>
    <footer>智能网格客观预报产品，未经人工订正</footer>
  </BasePanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ForecastDay } from '../../types/dashboard'
import BasePanel from '../common/BasePanel.vue'

const props = defineProps<{
  forecastText: string
  days: ForecastDay[]
}>()

const chart = computed(() => {
  const width = 390
  const paddingX = 14
  const max = Math.max(...props.days.map((day) => day.high)) + 2
  const min = Math.min(...props.days.map((day) => day.low)) - 2
  const height = 86
  const toY = (value: number) => 10 + ((max - value) / (max - min)) * height
  const toX = (index: number) => paddingX + (index * (width - paddingX * 2)) / (props.days.length - 1)
  const highCoords = props.days.map((day, index) => ({ x: toX(index), y: toY(day.high) }))
  const lowCoords = props.days.map((day, index) => ({ x: toX(index), y: toY(day.low) }))
  return { highCoords, lowCoords }
})

const highCoords = computed(() => chart.value.highCoords)
const lowCoords = computed(() => chart.value.lowCoords)
const highPoints = computed(() => highCoords.value.map((point) => `${point.x},${point.y}`).join(' '))
const lowPoints = computed(() => lowCoords.value.map((point) => `${point.x},${point.y}`).join(' '))
</script>

<style scoped>
.weather-forecast {
  flex: 1 1 0;
  min-height: 0;
}

.forecast-body {
  display: flex;
  flex-direction: column;
  padding-top: clamp(0.6rem, 1.1vh, 0.8rem);
}

.forecast-text {
  flex: 0 0 clamp(4.8rem, 8.8vh, 6rem);
  margin: clamp(0.55rem, 1.1vh, 0.9rem) 0.5rem clamp(0.65rem, 1.4vh, 1.1rem);
  color: #f1faff;
  font-size: clamp(0.8rem, 0.84vw, 1rem);
  line-height: 1.62;
  text-align: left;
  overflow: hidden;
}

.seven-title {
  margin-bottom: clamp(0.45rem, 1vh, 0.75rem);
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
}

.day-card {
  text-align: center;
  color: #dff6ff;
  font-size: clamp(0.65rem, 0.68vw, 0.82rem);
  line-height: 1.35;
}

.week {
  color: #c8e4ff;
  font-weight: 700;
}

.date {
  margin-top: 0.25rem;
  font-size: clamp(0.58rem, 0.62vw, 0.76rem);
}

.icon {
  margin-top: 0.25rem;
  height: clamp(1.45rem, 2.6vh, 1.85rem);
  font-size: clamp(1.1rem, 1.15vw, 1.45rem);
  line-height: clamp(1.45rem, 2.6vh, 1.85rem);
  filter: drop-shadow(0 0 0.32rem rgba(75, 213, 255, 0.85));
}

.weather {
  font-size: clamp(0.65rem, 0.68vw, 0.82rem);
}

.temp-chart {
  flex: 0 0 clamp(5.6rem, 10.5vh, 7.2rem);
  margin: 0.2rem 0.25rem 0;
}

.temp-chart svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.line {
  fill: none;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.high {
  stroke: #f6d663;
}

.low {
  stroke: #7ed2ff;
}

.point {
  stroke: rgba(255, 255, 255, 0.75);
  stroke-width: 1;
}

.high-point {
  fill: #f6d663;
}

.low-point {
  fill: #7ed2ff;
}

.temp-label {
  font-size: 11px;
  fill: #eaffff;
  font-weight: 700;
}

.wind-grid {
  margin-top: 0;
}

.wind-card {
  text-align: center;
  font-size: clamp(0.6rem, 0.63vw, 0.75rem);
  line-height: 1.55;
  color: #d8efff;
}

.night-icon {
  height: clamp(1.25rem, 2.2vh, 1.55rem);
  font-size: clamp(0.9rem, 0.95vw, 1.2rem);
}

footer {
  margin-top: auto;
  padding-top: clamp(0.4rem, 1vh, 0.7rem);
  text-align: center;
  color: #bcd8ef;
  font-size: clamp(0.72rem, 0.78vw, 0.95rem);
  letter-spacing: 0.06em;
}
</style>

<template>
  <BasePanel title="天气预报" class-name="weather-forecast" body-class="forecast-body">
    <div class="sub-title-row">短期预报</div>
    <p class="forecast-text">{{ forecastText }}</p>
    <div class="sub-title-row seven-title">七天预报</div>
    <WeeklyForecastPanel :listArray="days" />
  </BasePanel>
</template>

<script setup lang="ts">
import type { ForecastDay } from '../../types/dashboard'
import BasePanel from '../common/BasePanel.vue'
import WeeklyForecastPanel from './WeeklyForecastPanel.vue'

const props = defineProps<{
  forecastText: string
  days: ForecastDay[]
}>()
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
  margin: clamp(0.55rem, 1.1vh, 0.9rem) 0.5rem clamp(0.65rem, 1.8vh, 1.1rem);
  color: #f1faff;
  font-size: clamp(0.8rem, 0.84vw, 0.9rem);
  line-height: 1.62;
  text-align: left;
  overflow: auto;
  white-space: pre-line;
  max-height: clamp( 4rem,7.3vh,20%);
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
  color: #98C7C4;
  font-size: clamp(0.6rem, 0.63vw, 0.7rem);
  line-height: 1.25;
}

.week {
  color: #98C7C4;
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

.temp-chart {
  flex: 0 0 clamp(5.6rem, 10.5vh, 7.2rem);
  margin: 0.2rem 0.25rem 0;
  width: 100%;
  min-height: 0;
}

.wind-grid {
  margin-top: 0;
}

.wind-card {
  text-align: center;
  font-size: clamp(0.6rem, 0.63vw, 0.75rem);
  line-height: 1.55;
  color: #98C7C4;
}

.night-icon {
  height: clamp(1.25rem, 2.2vh, 1.55rem);
  font-size: clamp(0.6rem, 0.63vw, 0.7rem);
}

footer {
  margin-top: auto;
  padding-top: clamp(0.4rem, 1vh, 0.7rem);
  text-align: center;
  color:#fff;
  opacity: 0.48;
  font-size: clamp(0.7rem, 0.73vw, 0.8rem);
  letter-spacing: 0.06em;
}
</style>

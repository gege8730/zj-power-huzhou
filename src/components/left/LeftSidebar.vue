<template>
  <aside class="left-sidebar fade-in">
    <WeatherFactorsPanel :factors="factors" />
    <WeatherForecastPanel :forecast-text="forecastText" :days="days" />
  </aside>
</template>

<script setup lang="ts">
import type { ForecastDay, WeatherFactorGroup } from '../../types/dashboard'
import WeatherFactorsPanel from './WeatherFactorsPanel.vue'
import WeatherForecastPanel from './WeatherForecastPanel.vue'

defineProps<{
  factors: WeatherFactorGroup[]
  forecastText: string
  days: ForecastDay[]
}>()
</script>

<style scoped>
.left-sidebar {
  grid-column: 1;
  grid-row: 2;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--panel-gap);
}
</style>

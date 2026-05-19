<template>
  <aside class="left-sidebar fade-in">
    <WeatherFactorsPanel :factors="factors" />
    <WeatherForecastPanel :forecast-text="forecastText" :days="days" />
  </aside>
</template>

<script setup lang="ts">
import type { ForecastDay } from '../../types/dashboard'
import type { FactorConfig } from '@/store'
import WeatherFactorsPanel from './WeatherFactorsPanel.vue'
import WeatherForecastPanel from './WeatherForecastPanel.vue'

defineProps<{
  factors: FactorConfig[]
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
  z-index: 2;
}
</style>

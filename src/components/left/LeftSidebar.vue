<template>
  <aside class="left-sidebar fade-in">
    <WeatherFactorsPanel :factors="factors" />
    <WeatherForecastPanel
      v-if="!convection"
      :forecast-text="forecastText"
      :days="days"
    />
    <ConvectionPresetPanel v-else />
  </aside>
</template>

<script setup lang="ts">
import type { ForecastDay } from '../../types/dashboard'
import type { FactorConfig } from '@/store'
import WeatherFactorsPanel from './WeatherFactorsPanel.vue'
import WeatherForecastPanel from './WeatherForecastPanel.vue'
import ConvectionPresetPanel from './ConvectionPresetPanel.vue'

defineProps<{
  factors: FactorConfig[]
  forecastText: string
  days: ForecastDay[]
  convection?: boolean
}>()
</script>

<style scoped>
.left-sidebar {
  grid-column: 1;
  grid-row: 2;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--panel-gap);
  z-index: 2;
}
</style>

<template>
  <BasePanel title="要素叠加" class-name="weather-factors">
    <div class="factor-list">
      <div v-for="factor in factors" :key="factor.name" class="factor-row">
        <span class="factor-name">{{ factor.name }}</span>
        <div class="factor-options">
          <span
            v-for="(option, index) in factor.options"
            :key="option"
            class="factor-option"
            :class="{ active: index === factor.activeIndex }"
          >
            {{ option }}
          </span>
        </div>
      </div>
    </div>
  </BasePanel>
</template>

<script setup lang="ts">
import type { WeatherFactorGroup } from '../../types/dashboard'
import BasePanel from '../common/BasePanel.vue'

defineProps<{
  factors: WeatherFactorGroup[]
}>()
</script>

<style scoped>
.weather-factors {
  flex: 0 0 39%;
  min-height: 18rem;
}

.factor-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: clamp(0.38rem, 0.98vh, 0.55rem);
}

.factor-row {
  min-height: clamp(1.45rem, 2.70vh, 2.05rem);
  display: grid;
  grid-template-columns: minmax(7rem, 20%) 1fr;
  align-items: center;
  padding: 0 clamp(0.55rem, 0.65vw, 0.8rem) 0.1rem clamp(0.55rem, 0.65vw, 0.8rem);
  background: rgba(17, 75, 143, 0.65);
}

.factor-name {
  position: relative;
  padding-left: 1.35rem;
  color: #c3e8f8;
  font-size: clamp(0.82rem, 0.84vw, 1rem);
}

.factor-name::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.25rem;
  width: 0.7rem;
  height: 0.7rem;
  background: radial-gradient(circle, #89eaff 0 24%, #137bd1 29% 62%, rgba(32, 171, 255, 0.26) 66%);
}

.factor-options {
  display: flex;
  justify-content: flex-start;
  gap: clamp(0.45rem, 1vw, 1.25rem);
  align-items: center;
  white-space: nowrap;
}

.factor-option {
  min-width: 2rem;
  padding: 0.1rem 0.45rem;
  color: #ffffff;
  font-size: clamp(0.7rem, 0.74vw, 0.9rem);
  text-align: center;
}

.factor-option.active {
  background: linear-gradient(90deg, transparent, rgba(39, 119, 245, 0.8), transparent);
  text-shadow: 0 0 0.5rem rgba(96, 213, 255, 0.8);
}
</style>

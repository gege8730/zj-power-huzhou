<template>
  <BasePanel title="相似日" class-name="similar-day">
    <div class="sub-title-row">04月15日相似日</div>
    <div class="similar-list">
      <article v-for="day in days" :key="day.date" class="similar-item">
        <div class="similar-date">{{ day.date }}</div>
        <div class="percent-ring">
          <span>{{ day.percent }}%</span>
        </div>
        <div class="metrics">
          <div>最高温：{{ day.high.toFixed(1) }}℃</div>
          <div>最低温：{{ day.low.toFixed(1) }}℃</div>
          <div>降水：{{ day.rain.toFixed(1) }}mm</div>
        </div>
      </article>
    </div>
  </BasePanel>
</template>

<script setup lang="ts">
import type { SimilarDay } from '../../types/dashboard'
import BasePanel from '../common/BasePanel.vue'

defineProps<{
  days: SimilarDay[]
}>()
</script>

<style scoped>
.similar-day {
  flex: 0 0 29%;
  min-height: 15rem;
}

.similar-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(0.45rem, 0.7vw, 0.8rem);
  margin-top: clamp(0.45rem, 1.1vh, 0.8rem);
}

.similar-item {
  text-align: center;
  color: #e9faff;
}

.similar-date {
  margin-bottom: 0.45rem;
  font-size: clamp(0.9rem, 0.95vw, 1.15rem);
}

.percent-ring {
  position: relative;
  width: min(82%, 5.2rem);
  aspect-ratio: 1.58;
  margin: 0 auto clamp(0.45rem, 1vh, 0.7rem);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: clamp(1.1rem, 1.15vw, 1.45rem);
  font-weight: 900;
  background: radial-gradient(ellipse at center, rgba(27, 191, 255, 0.75) 0 34%, rgba(16, 116, 210, 0.35) 35% 51%, transparent 53%);
  filter: drop-shadow(0 0 0.65rem rgba(27, 191, 255, 0.75));
}

.percent-ring::before,
.percent-ring::after {
  content: "";
  position: absolute;
  inset: 34% -7% 0;
  border: 1px solid rgba(35, 196, 255, 0.72);
  border-radius: 50%;
  transform: rotate(-4deg);
}

.percent-ring::after {
  inset: 46% -14% -4%;
  opacity: 0.5;
}

.metrics {
  font-size: clamp(0.68rem, 0.72vw, 0.88rem);
  line-height: 1.65;
  color: #d8f1ff;
}
</style>

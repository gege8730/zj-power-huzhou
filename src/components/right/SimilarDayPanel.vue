<template>
  <BasePanel title="相似日" class-name="similar-day">
    <div class="sub-title-row">04月15日相似日</div>
    <div class="similar-list">
      <article v-for="day in days" :key="day.date" class="similar-item">
        <div class="similar-date">{{ day.date }}</div>
        <div class="percent-ring">
          <img src="../../assets/sample_date.png" alt="icon">
          <span class="val">{{ day.percent }}%</span>
        </div>
        <div class="metrics">
          <div>最高温：<span class="val">{{ day.high.toFixed(1) }}℃</span></div>
          <div>最低温：<span class="val">{{ day.low.toFixed(1) }}℃</span></div>
          <div>降水：<span class="val">{{ day.rain.toFixed(1) }}mm</span></div>
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

<style lang="scss" scoped>
.similar-day {
  flex: 0 0 29%;
  min-height: 15rem;
}
.similar-list {
  display: grid;
  height: calc(100% - clamp(1.8rem, 3vh, 2.25rem) - clamp(0.45rem, 0.9vh, 0.65rem) - clamp(0.45rem, 1.1vh, 0.8rem));
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(0.45rem, 0.7vw, 0.8rem);
  margin-top: clamp(0.45rem, 1.1vh, 0.8rem);
}

.similar-item {
  text-align: center;
  color: #e9faff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
}

.similar-date {
  font-weight: 300;
  color: #c3e8f8;
  font-size: clamp(0.9rem, 0.8vw, 1.15rem);
}


.percent-ring {
  position: relative;
  color: #fff;
  font-size: clamp(1rem, 0.85vw, 1.35rem);
  font-weight: 600;
  img{
    display: block;
    position: relative;
    top: 0.9rem;
  }
  .val{
    position: absolute;
    top: 20%;
    left: 0.2rem;
    width: 100%;
    text-align: center;
  }
}

.metrics {
  font-size: clamp(0.68rem, 0.70vw, 0.88rem);
  line-height: 1.55;
  color: #d8f1ff;
  font-weight: 300;
  margin-top:0.45rem;
  .val {
    color: #fff;
  }
}
</style>

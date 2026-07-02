<template>
  <BasePanel title="相似日" class-name="similar-day">
    <div class="sub-title-row">{{ titleDate || '相似日' }}</div>
    <div class="similar-list">
      <article v-for="day in days" :key="day.date" class="similar-item">
        <div class="similar-date">{{ day.date }}</div>
        <div class="percent-ring">
          <img src="../../assets/sample_date.png" alt="icon">
          <span class="ring-particle particle-a"></span>
          <span class="ring-particle particle-b"></span>
          <span class="ring-particle particle-c"></span>
          <span class="ring-particle particle-d"></span>
          <span class="ring-particle particle-e"></span>
          <span class="ring-particle particle-f"></span>
          <span class="ring-particle particle-g"></span>
          <span class="ring-particle particle-h"></span>
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
  titleDate?: string
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
  --ring-image-width: clamp(4.9rem, 4.6vw, 5.5rem);
  --ring-image-height: calc(var(--ring-image-width) * 0.7273);
  color: #fff;
  font-size: clamp(1rem, 0.85vw, 1.35rem);
  font-weight: 600;
  isolation: isolate;
  perspective: 6rem;
  transform-style: preserve-3d;
  filter: drop-shadow(0 0 0.35rem rgba(56, 185, 255, 0.18));
  img{
    display: block;
    position: relative;
    top: 0.9rem;
    width: var(--ring-image-width);
    height: auto;
    z-index: 1;
  }
  .val{
    position: absolute;
    top: 20%;
    left: 0.2rem;
    width: 100%;
    text-align: center;
    z-index: 4;
    text-shadow: 0 0 0.45rem rgba(255, 255, 255, 0.7);
  }
}

.percent-ring::before {
  content: "";
  position: absolute;
  left: -8%;
  right: -8%;
  top: 68%;
  height: clamp(0.95rem, 1.15vh, 1.25rem);
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(91, 227, 255, 0.36) 0 12%, rgba(255, 227, 62, 0.2) 20%, rgba(91, 227, 255, 0.12) 38%, transparent 68%);
  opacity: 0.62;
  z-index: 0;
  filter: blur(0.03rem);
  transform: translateY(-50%) rotateX(68deg);
  animation: ring-aurora 4.8s ease-in-out infinite;
}

.ring-particle {
  position: absolute;
  left: 50%;
  top: 68%;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 3;
  transform-style: preserve-3d;
  animation: ring-particle-orbit var(--orbit-duration) linear infinite;
}

.ring-particle::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: var(--particle-size);
  height: var(--particle-size);
  border-radius: 50%;
  background: var(--particle-color);
  box-shadow:
    0 0 0.28rem var(--particle-color),
    0 0 0.7rem rgba(91, 227, 255, 0.52);
  transform: translate3d(var(--orbit-radius), 0, 0) translate(-50%, -50%);
}

.particle-a {
  --start-angle: 18deg;
  --orbit-duration: 4.4s;
  --particle-size: 0.18rem;
  --particle-color: #fff381;
  --orbit-radius: 2.35rem;
}

.particle-b {
  --start-angle: 126deg;
  --orbit-duration: 5.6s;
  --particle-size: 0.14rem;
  --particle-color: #7ff0ff;
  --orbit-radius: 2.18rem;
}

.particle-c {
  --start-angle: 214deg;
  --orbit-duration: 6.2s;
  --particle-size: 0.16rem;
  --particle-color: #ffffff;
  --orbit-radius: 2.42rem;
}

.particle-d {
  --start-angle: 302deg;
  --orbit-duration: 7.4s;
  --particle-size: 0.12rem;
  --particle-color: #56dfff;
  --orbit-radius: 2.26rem;
}

.particle-e {
  --start-angle: 72deg;
  --orbit-duration: 4.9s;
  --particle-size: 0.1rem;
  --particle-color: #fff8b8;
  --orbit-radius: 2.48rem;
}

.particle-f {
  --start-angle: 168deg;
  --orbit-duration: 6.8s;
  --particle-size: 0.11rem;
  --particle-color: #9ff6ff;
  --orbit-radius: 2.3rem;
}

.particle-g {
  --start-angle: 254deg;
  --orbit-duration: 5.2s;
  --particle-size: 0.09rem;
  --particle-color: #ffffff;
  --orbit-radius: 2.08rem;
}

.particle-h {
  --start-angle: 338deg;
  --orbit-duration: 8.1s;
  --particle-size: 0.1rem;
  --particle-color: #65e7ff;
  --orbit-radius: 2.55rem;
}

@keyframes ring-particle-orbit {
  from {
    transform: rotateY(var(--start-angle));
  }
  to {
    transform: rotateY(calc(var(--start-angle) + 360deg));
  }
}

@keyframes ring-aurora {
  0%,
  100% {
    opacity: 0.38;
    transform: translateY(-50%) rotateX(68deg) scaleX(0.94);
  }
  50% {
    opacity: 0.72;
    transform: translateY(-50%) rotateX(68deg) scaleX(1.08);
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

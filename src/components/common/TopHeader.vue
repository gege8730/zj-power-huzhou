<template>
  <header class="top-header">
    <div class="date-block">
      <div class="time">{{ currentTime }}</div>
      <div class="date">{{ date }}</div>
    </div>
    <div class="week">{{ week }}</div>
    <div class="header-actions">
      <div class="help"><img src="../../assets/@.png" alt="帮助">{{ helpText }}</div>
      <span
        class="fullscreen-btn"
        :class="{ active: layoutStore.isMapFullscreen }"
        :title="layoutStore.isMapFullscreen ? '退出全屏' : '全屏'"
        @click="layoutStore.toggleMapFullscreen()"
      >
        <span class="fullscreen-icon" aria-hidden="true"></span>
        <span>{{ layoutStore.isMapFullscreen ? '退出全屏' : '全屏' }}</span>
      </span>
    </div>
  </header>
</template>
<script setup lang="ts">
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { ref, onMounted, onUnmounted } from 'vue'
import { useLayoutStore } from '@/store'

dayjs.locale('zh-cn')
let currentTime = ref(dayjs().format('HH:mm:ss'))
let date = dayjs().format('YYYY年MM月DD日')
let week = dayjs().format('dddd')
let helpText = '告警规则说明'
let timer: number
const layoutStore = useLayoutStore()

onMounted(() => {
  timer = setInterval(() => {
    currentTime.value = dayjs().format('HH:mm:ss')
  }, 500)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>
<style scoped>
.top-header {
  grid-column: 1 / -1;
  grid-row: 1;
  position: relative;
  left: calc(-1*1*var(--edge-x));
  width: calc(100% + 2*var(--edge-x));
  height: calc(100%);
  display: flex;
  align-items: flex-start;
  padding: 1.15vh 0;
  background: 
    url('../../assets/title.png'),
    linear-gradient(180deg, rgba(7, 62, 106, 0.86), rgba(7, 28, 62, 0.2));
  background-size: 100% 100%;  /* 同时作用于两个背景 */
  background-repeat: no-repeat;
  overflow: hidden;
  z-index: 2;
}

.top-header::before {
  content: "";
  position: absolute;
  left: 25%;
  top: 0;
  width: 150%;
  height: 96%;
  transform: translateX(-50%);
  background: linear-gradient(
    105deg,
    transparent 0%,
    transparent 35%,
    rgba(128, 128, 128, 0.08) 43%,
    rgba(81, 133, 146, 0.452) 50%,
    rgba(128, 128, 128, 0.16) 56%,
    transparent 60%,
    transparent 100%
  );
  background-size: 230% 100%;
  background-position: 135% 0;
  mix-blend-mode: screen;
  pointer-events: none;
  z-index: 1;
  animation: title-highlight-sweep 4s ease-in-out infinite;
}

@keyframes title-highlight-sweep {
  0%,
  18% {
    opacity: 0;
    background-position: 0 0;
  }
  30% {
    opacity: 1;
  }
  64% {
    opacity: 0.95;
    background-position: -135% 0;
  }
  100% {
    opacity: 0;
    background-position: -135% 0;
  }
}
.date-block {
  width: clamp(6rem, 6.4vw, 8rem);
  margin-left: clamp(2rem, 3.8vw, 4.6rem);
  text-align: center;
  color: #f4fbff;
  z-index: 2;
}

.time {
  font-size: clamp(0.9rem, 0.85vw, 1.05rem);
  line-height: 1.15;
  letter-spacing: 0.03em;
}

.date {
  font-size: clamp(0.75rem, 0.75vw, 0.95rem);
}

.week {
  margin-left: clamp(0.5rem, 1vw, 2.2rem);
  margin-top: 0.15rem;
  font-size: clamp(1rem, 1vw, 1.25rem);
  letter-spacing: 0.12em;
  z-index: 2;
}

.title-wrap {
  position: absolute;
  left: 50%;
  top: 0;
  width: clamp(42rem, 46vw, 58rem);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateX(-50%);
  background: linear-gradient(90deg, transparent, rgba(3, 60, 105, 0.85) 18%, rgba(3, 60, 105, 0.95) 82%, transparent);
}
h1 {
  position: relative;
  margin: 0;
  font-size: clamp(2rem, 2.08vw, 2.8rem);
  line-height: var(--header-h);
  font-weight: 900;
  font-style: italic;
  letter-spacing: 0.18em;
  white-space: nowrap;
}

.slash {
  position: absolute;
  top: 39%;
  color: #16c7ff;
  font-size: clamp(1.35rem, 1.5vw, 2rem);
  font-weight: 900;
  letter-spacing: 0.25em;
  opacity: 0.75;
}

.slash.left {
  left: 15%;
}

.slash.right {
  right: 14%;
}

.header-actions {
  position: absolute;
  right: clamp(1rem, 2vw, 2.4rem);
  top: 25%;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: clamp(0.55rem, 0.75vw, 0.9rem);
}

.help {
  color: #c3e8f8;
  font-size: clamp(0.75rem, 0.75vw, 0.95rem);
  display: flex;
  align-items: center;
  gap: 0.3rem;
  white-space: nowrap;
}

.fullscreen-btn {
  height: clamp(1.55rem, 2.5vh, 2rem);
  min-width: clamp(4.4rem, 4.4vw, 5.6rem);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.32rem;
  padding: 0 0.62rem;
  border: none;
  border-radius: 0.16rem;
  color: #dff8ff;
  font-size: clamp(0.72rem, 0.72vw, 0.9rem);
  background: transparent;
  cursor: pointer;
  transition: color 0.22s ease;
}

.fullscreen-btn:hover,
.fullscreen-btn.active {
  color: #fff381;
}

.fullscreen-icon {
  position: relative;
  width: 0.9rem;
  height: 0.9rem;
  flex: 0 0 0.9rem;
}

.fullscreen-icon::before,
.fullscreen-icon::after {
  content: "";
  position: absolute;
  inset: 0;
  border: 1px solid currentColor;
}

.fullscreen-icon::before {
  clip-path: polygon(0 0, 43% 0, 43% 12%, 12% 12%, 12% 43%, 0 43%, 0 0, 57% 0, 100% 0, 100% 43%, 88% 43%, 88% 12%, 57% 12%);
}

.fullscreen-icon::after {
  clip-path: polygon(0 57%, 12% 57%, 12% 88%, 43% 88%, 43% 100%, 0 100%, 0 57%, 57% 88%, 88% 88%, 88% 57%, 100% 57%, 100% 100%, 57% 100%);
}
</style>

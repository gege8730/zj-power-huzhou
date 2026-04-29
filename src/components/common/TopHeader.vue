<template>
  <header class="top-header">
    <div class="date-block">
      <div class="time">{{ time }}</div>
      <div class="date">{{ date }}</div>
    </div>
    <div class="week">{{ week }}</div>
    <div class="title-wrap">
      <span class="slash left">///</span>
      <h1 class="glow-text">{{ title }}</h1>
      <span class="slash right">///</span>
    </div>
    <div class="help">？ {{ helpText }}</div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  time: string
  date: string
  week: string
  title: string
  helpText: string
}>()
</script>

<style scoped>
.top-header {
  grid-column: 1 / -1;
  grid-row: 1;
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start;
  padding-top: 1.15vh;
  background: linear-gradient(180deg, rgba(7, 62, 106, 0.86), rgba(7, 28, 62, 0.2));
}

.top-header::before,
.top-header::after {
  content: "";
  position: absolute;
  top: 0;
  width: min(36vw, 43rem);
  height: 88%;
  border-bottom: 0.12rem solid rgba(34, 178, 255, 0.62);
  pointer-events: none;
}

.top-header::before {
  left: calc(var(--edge-x) * -1);
  clip-path: polygon(0 0, 94% 0, 82% 100%, 0 100%);
  background: linear-gradient(90deg, rgba(8, 89, 143, 0.42), rgba(5, 31, 64, 0.04));
}

.top-header::after {
  right: calc(var(--edge-x) * -1);
  clip-path: polygon(18% 0, 100% 0, 100% 100%, 30% 100%);
  background: linear-gradient(270deg, rgba(8, 89, 143, 0.42), rgba(5, 31, 64, 0.04));
}

.date-block {
  width: clamp(6rem, 6.4vw, 8rem);
  margin-left: clamp(2rem, 3.8vw, 4.6rem);
  text-align: center;
  color: #f4fbff;
  z-index: 2;
}

.time {
  font-size: clamp(1.05rem, 1.05vw, 1.35rem);
  line-height: 1.15;
  letter-spacing: 0.03em;
}

.date {
  font-size: clamp(0.75rem, 0.75vw, 0.95rem);
  font-weight: 700;
}

.week {
  margin-left: clamp(1.2rem, 1.8vw, 2.2rem);
  margin-top: 0.15rem;
  font-size: clamp(1rem, 1vw, 1.25rem);
  font-weight: 700;
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

.title-wrap::before,
.title-wrap::after {
  content: "";
  position: absolute;
  top: 0;
  width: 16%;
  height: 92%;
  border-top: 0.25rem solid #1db8ff;
  opacity: 0.86;
}

.title-wrap::before {
  left: 0;
  transform: skewX(-35deg);
  border-left: 0.25rem solid #1db8ff;
}

.title-wrap::after {
  right: 0;
  transform: skewX(35deg);
  border-right: 0.25rem solid #1db8ff;
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

.help {
  position: absolute;
  right: clamp(1rem, 2vw, 2.4rem);
  top: 43%;
  color: #e9f6ff;
  font-size: clamp(0.75rem, 0.75vw, 0.95rem);
  font-weight: 700;
  z-index: 2;
}
</style>

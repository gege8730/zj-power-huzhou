<template>
  <header class="top-header">
    <div class="date-block">
      <div class="time">{{ time }}</div>
      <div class="date">{{ date }}</div>
    </div>
    <div class="week">{{ week }}</div>
    <div class="help"><img src="../../assets/@.png" alt="帮助">{{ helpText }}</div>
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

.help {
  position: absolute;
  right: clamp(1rem, 2vw, 2.4rem);
  top: 25%;
  color: #c3e8f8;
  font-size: clamp(0.75rem, 0.75vw, 0.95rem);
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
</style>

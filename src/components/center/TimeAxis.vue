<template>
  <div class="time-axis neon-border">
    <button class="axis-control" type="button">◀</button>
    <button class="axis-control" type="button">▶</button>
    <div class="axis-line">
      <div v-for="item in timeline" :key="item" class="axis-item" :class="{ active: item === '15时' }">
        <span class="diamond"></span>
        <span class="label">{{ item }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  timeline: string[]
}>()
</script>

<style scoped>
.time-axis {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 1.8%;
  height: clamp(2rem, 3.5vh, 2.4rem);
  display: flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  border-radius: 0.2rem;
  background: linear-gradient(180deg, rgba(8, 82, 168, 0.82), rgba(3, 47, 104, 0.88));
  z-index: 6;
}

.axis-control {
  width: clamp(1.5rem, 1.45vw, 1.8rem);
  height: clamp(1.5rem, 1.45vw, 1.8rem);
  margin-right: 0.45rem;
  border: 1px solid #31b8ff;
  border-radius: 0.25rem;
  color: #fff;
  background: #0787dc;
  box-shadow: inset 0 0 0.5rem rgba(200, 246, 255, 0.4);
}

.axis-line {
  position: relative;
  flex: 1;
  height: 1.65rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-top: 0.05rem;
}

.axis-line::before {
  content: "";
  position: absolute;
  left: 0.25rem;
  right: 0.25rem;
  top: 0.43rem;
  height: 0.2rem;
  background: linear-gradient(90deg, rgba(80, 217, 255, 0.4), rgba(80, 217, 255, 0.95), rgba(80, 217, 255, 0.35));
}

.axis-item {
  position: relative;
  width: 2rem;
  height: 1.9rem;
  text-align: center;
  font-size: clamp(0.58rem, 0.6vw, 0.72rem);
  color: #e5f8ff;
  font-weight: 800;
}

.diamond {
  position: relative;
  display: block;
  width: 0.5rem;
  height: 0.5rem;
  margin: 0.2rem auto 0.25rem;
  transform: rotate(45deg);
  background: #c9edff;
  box-shadow: 0 0 0.5rem rgba(92, 213, 255, 0.9);
}

.axis-item.active .diamond {
  width: 0.82rem;
  height: 0.82rem;
  margin-top: 0.05rem;
  background: #ffe33e;
  box-shadow: 0 0 0.75rem rgba(255, 215, 42, 0.95);
}

.axis-item.active .label {
  color: #fff381;
}
</style>

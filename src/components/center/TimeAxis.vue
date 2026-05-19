<template>
  <div class="time-axis neon-border">
    <div class="axis-control" :style="{ backgroundImage: `url(${left_btn})` }"></div>
    <div class="axis-control" :style="{ backgroundImage: `url(${right_btn})` }"></div>
    <el-scrollbar class="axis-line-container" :always="true">
      <div class="axis-line">
        <div v-for="item in timeline" :key="item" class="axis-item" :class="{ active: item === '15时' }">
          <span class="diamond"></span>
          <span class="label">{{ item }}</span>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import left_btn from '../../assets/left_arrow.png'
import right_btn from '../../assets/right_arrow.png'
defineProps<{
  timeline: string[]
}>()
</script>

<style scoped>
.time-axis {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0%;
  width: 100%;
  height: clamp(2rem, 4.5vh, 3rem);
  display: flex;
  align-items: center;
  padding: 0 0.5rem;
  border-width: .09259259vh .05208333vw 0 .05208333vw;
  border-style: solid;
  border-image: linear-gradient(180deg, rgba(55, 159, 255, .2435) 0%, rgba(0, 0, 0, 0) 100%) 1 1 0 1;
  background: linear-gradient(180deg,rgba(0,50,115,.7) 0%,rgba(0,50,115,.4) 100%);
  z-index: 6;
}

.axis-control {
  width: clamp(1.5rem, 1.45vw, 1.8rem);
  height: clamp(1.5rem, 1.45vw, 1.8rem);
  margin-right: 0.5rem;
}
.axis-line-container{
  width: calc(100% - clamp(1.5rem, 1.45vw, 1.8rem) - clamp(1.5rem, 1.45vw, 1.8rem) - 1rem);
  
}
.axis-line {
  position: relative;
  height: 1.65rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-top: 0.05rem;
  width: fit-content;
}

.axis-line::before {
  content: "";
  position: absolute;
  left: 0.25rem;
  right: 0.25rem;
  top: 0.43rem;
  height: 0.2rem;
  background: #044990;
}

.axis-item {
  position: relative;
  width: 3.4rem;
  height: 1.9rem;
  text-align: center;
  font-size: clamp(0.58rem, 1.1vw, 0.82rem);
  color: #e5f8ff;
  font-weight: 500;
  cursor: pointer;
}

.diamond {
  position: relative;
  display: block;
  width: 0.35rem;
  height: 0.35rem;
  margin: 0.25rem auto 0.25rem;
  transform: rotate(45deg);
  background: #c9edff;
  box-shadow: 0 0 0.5rem rgba(92, 213, 255, 0.9);
}

.axis-item.active .diamond {
  width: 0.45rem;
  height: 0.45rem;
  margin-top: 0.25rem;
  background: #ffe33e;
  box-shadow: 0 0 0.75rem rgba(255, 215, 42, 0.95);
}

.axis-item.active .label {
  color: #fff381;
}
</style>

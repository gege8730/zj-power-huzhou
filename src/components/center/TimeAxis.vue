<template>
  <div class="time-axis neon-border">
    <div class="axis-control" :style="{ backgroundImage: `url(${left_btn})` }"></div>
    <div class="axis-control" :style="{ backgroundImage: `url(${right_btn})` }"></div>
    <el-scrollbar ref="scrollbarRef" class="axis-line-container" :always="true">
      <div class="axis-line">
        <div v-for="(item,index) in timelinelist" :key="index" class="axis-item" :class="{ active: index == store.timeline.currentIndex }" @click="store.setTimelineIndex(index)">
          <span class="diamond"></span>
          <span class="label">{{ item.time }}</span>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue'
import left_btn from '../../assets/left_arrow.png'
import right_btn from '../../assets/right_arrow.png'
import dayjs from 'dayjs'
import { useMapStore } from '@/store'

const store = useMapStore()
const props = defineProps<{
  timeline: Array<{ dateTime: string; filePath: string }>
}>()

const timelinelist = computed(() => props.timeline.map(item => {
  const date = dayjs(item.dateTime)
  let time,day
  if (date.hour() === 0) {
    time = `${date.format('M月D日')}`
    day = `${date.format('M月D日')}`
  } else {
    time = `${date.hour()}时`
    day = `${date.format('M月D日HH时')}`
  }
  return {time, day}
}))
const scrollbarRef = ref()

const scrollToEnd = () => {
  nextTick(() => {
    if (scrollbarRef.value) {
      scrollbarRef.value.setScrollLeft(timelinelist.value.length * 50)
    }
  })
}

onMounted(scrollToEnd)
watch(() => props.timeline, scrollToEnd, { deep: true })
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

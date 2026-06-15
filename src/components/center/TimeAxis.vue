<template>
  <div class="time-axis neon-border">
    <div class="axis-control" :style="{ backgroundImage: `url(${left_btn})` }" @click="scrollLeft"></div>
    <div class="axis-control" :style="{ backgroundImage: `url(${right_btn})` }" @click="scrollRight"></div>
    <el-scrollbar ref="scrollbarRef" class="axis-line-container" :always="true">
      <div class="axis-line">
        <el-popover placement="top" trigger="hover" popper-class="time-popover" v-for="(item,index) in timelinelist" :key="index">
          <template #reference>
            <div class="axis-item" :class="{ active: index == store.timeline.currentIndex }" @click="store.setTimelineIndex(index)">
              <span class="diamond"></span>
              <span class="label">{{ item.time }}</span>
            </div>
          </template>
          <template #default>
            <div class="popover-content">{{ item.day }}</div>
          </template>
        </el-popover>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed, watch } from 'vue'
import left_btn from '../../assets/left_arrow.png'
import right_btn from '../../assets/right_arrow.png'
import dayjs from 'dayjs'
import { useLayoutStore, useMapStore } from '@/store'

const store = useMapStore()
const layoutStore = useLayoutStore()
const props = defineProps<{
  timeline: Array<{ dateTime: string; filePath: string }>
}>()

const timelinelist = computed(() => props.timeline.map(item => {
  const duration = store.currentFactor.eleDuration[store.currentOptionIndex]
  const date = dayjs(item.dateTime)
  let time, day

  if (duration == 'D' || duration == '24H') {
    time = `${date.format('D日')}`
    day = `${date.format('M月D日HH时')}`
  } else if (duration == 'H' || duration == '3H' || duration == '6H' || duration == '12H') {
    time = `${date.hour()}时`
    day = `${date.format('M月D日HH时')}`
  } else {
    time = `${date.format('HH:mm')}`
    day = `${date.format('M月D日HH:mm')}`
  }
  return { time, day }
}))
const scrollbarRef = ref()
let resizeObserver: ResizeObserver | null = null
let defaultScrollTimer: ReturnType<typeof window.setTimeout> | null = null

const getScrollbarWrap = () => scrollbarRef.value?.wrapRef as HTMLElement | undefined

const getMaxScrollLeft = () => {
  const wrap = getScrollbarWrap()
  if (!wrap) return timelinelist.value.length * 50
  return Math.max(0, wrap.scrollWidth - wrap.clientWidth)
}

const updateScrollbar = () => {
  scrollbarRef.value?.update?.()
}

const scrollToStart = () => {
  nextTick(() => {
    updateScrollbar()
    scrollbarRef.value?.setScrollLeft(0)
  })
}

const scrollToEnd = () => {
  nextTick(() => {
    updateScrollbar()
    scrollbarRef.value?.setScrollLeft(getMaxScrollLeft())
  })
}

const scrollToDefault = () => {
  if (store.productMode === 'forecast') {
    scrollToStart()
    return
  }
  scrollToEnd()
}

/**
 * 全屏/退出全屏时，时间轴容器宽度会跟随布局动画变化。
 * 实况模式要求默认停在最右侧，所以需要在动画结束后再补一次定位，
 * 否则从全屏切回普通布局时会使用旧的 scrollWidth，导致没有滑到最右。
 */
const scheduleDefaultScroll = () => {
  scrollToDefault()

  if (defaultScrollTimer) {
    window.clearTimeout(defaultScrollTimer)
  }

  defaultScrollTimer = window.setTimeout(() => {
    scrollToDefault()
    defaultScrollTimer = null
  }, 460)
}

const scrollLeft = () => {
  const currentIndex = store.timeline.currentIndex
  if (currentIndex > 0) {
    store.setTimelineIndex(currentIndex - 1)
  }
}

const scrollRight = () => {
  const currentIndex = store.timeline.currentIndex
  if (currentIndex < timelinelist.value.length - 1) {
    store.setTimelineIndex(currentIndex + 1)
  }
}

onMounted(() => {
  scheduleDefaultScroll()

  const wrap = getScrollbarWrap()
  if (wrap && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (store.productMode !== 'forecast') {
        scrollToEnd()
      }
    })
    resizeObserver.observe(wrap)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (defaultScrollTimer) {
    window.clearTimeout(defaultScrollTimer)
  }
})

watch(() => [props.timeline, store.productMode], scheduleDefaultScroll, { deep: true })
watch(() => layoutStore.isMapFullscreen, scheduleDefaultScroll)
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
  cursor: pointer;
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
  width: 100%;
  min-width: max-content;
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

/* popover 样式 */
:global(.time-popover.el-popper) {
  background: linear-gradient(180deg, rgba(0, 50, 115, 0.95) 0%, rgba(0, 50, 115, 0.85) 60%) !important;
  border: 1px solid rgba(55, 159, 255, 0.5) !important;
  font-size: 12px;
  color: #e5f8ff !important;
  width: auto !important;
  min-width: 0 !important;
}

:global(.time-popover.el-popper .el-popper__arrow::before) {
  border-color: rgba(0, 50, 115, 0.95) !important;
}

:global(.time-popover.el-popper .el-popper__arrow::after) {
  border-color: rgba(0, 50, 115, 0.95) !important;
}

:global(.time-popover.el-popper[data-popper-placement^=top] .el-popper__arrow::before) {
  border-color: rgba(0, 50, 115, 0.95) !important;
}

:global(.time-popover.el-popper[data-popper-placement^=top] .el-popper__arrow::after) {
  border-color: rgba(0, 50, 115, 0.95) !important;
}

:global(.time-popover .el-popover__title) {
  color: #e5f8ff !important;
  font-size: 0.8rem !important;
}

:global(.time-popover .el-popover__content) {
  color: #e5f8ff !important;
  font-size: 0.8rem !important;
  padding: 0.3rem 0.5rem;
}
</style>

<style>
/* popover 全局样式 */
.time-popover.el-popper {
  background: linear-gradient(180deg, rgba(0, 50, 115, 0.75) 0%, rgba(0, 50, 115, 0.65) 100%) !important;
  border: 1px solid rgba(0, 50, 115, 0.7) !important;
  color: #e5f8ff !important;
  width: auto !important;
  padding: 0.2rem 0.5rem !important;
}

.time-popover.el-popper .el-popper__arrow::before,
.time-popover.el-popper[data-popper-placement^=top] .el-popper__arrow::before {
  background: linear-gradient(180deg, rgba(0, 50, 115, 0.75) 0%, rgba(0, 50, 115, 0.65) 100%) !important;
}

.time-popover .el-popover__title {
  color: #e5f8ff !important;
}

.time-popover .el-popover__content,
.time-popover .popover-content {
  color: #e5f8ff !important;
}
</style>

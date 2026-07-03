<template>
  <div class="time-axis neon-border">
    <button
      class="axis-control"
      :class="{ disabled: !canGoLeft }"
      :style="{ backgroundImage: `url(${left_btn})` }"
      type="button"
      aria-label="上一个时次"
      :disabled="!canGoLeft"
      @click="scrollLeft"
    ></button>
    <button
      class="axis-control"
      :class="{ disabled: !canGoRight }"
      :style="{ backgroundImage: `url(${right_btn})` }"
      type="button"
      aria-label="下一个时次"
      :disabled="!canGoRight"
      @click="scrollRight"
    ></button>
    <el-scrollbar ref="scrollbarRef" class="axis-line-container" :always="true">
      <div class="axis-line">
        <el-popover placement="top" trigger="hover" popper-class="time-popover" v-for="(item,index) in timelinelist" :key="index">
          <template #reference>
            <button
              class="axis-item"
              :class="[
                { active: index == store.timeline.currentIndex, convection: store.isConvectionMode },
                item.riskClass,
              ]"
              :style="{ '--axis-delay': `${(index % 7) * 0.13}s` }"
              :data-axis-index="index"
              type="button"
              @click="selectTimelineIndex(index)"
            >
              <span class="diamond"></span>
              <span class="label">{{ item.time }}</span>
            </button>
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
  return { time, day, riskClass: getConvectionRiskClass(item.filePath) }
}))

const getConvectionRiskClass = (filePath: string) => {
  if (!store.isConvectionMode) return ''
  const frame = store.mapRenderData.convectionData?.frames?.[filePath]
  const maxRisk = frame ? Math.max(...Object.values(frame).map((risk) => Number(risk) || 0)) : 0
  if (maxRisk >= 2) return 'risk-high'
  if (maxRisk >= 1) return 'risk-middle'
  return 'risk-low'
}
const canGoLeft = computed(() => store.timeline.currentIndex > 0)
const canGoRight = computed(() => store.timeline.currentIndex < timelinelist.value.length - 1)
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

const scrollTimelineItemIntoView = (index: number) => {
  nextTick(() => {
    const wrap = getScrollbarWrap()
    const item = wrap?.querySelector(`[data-axis-index="${index}"]`) as HTMLElement | null
    if (!wrap || !item) return

    const itemLeft = item.offsetLeft
    const itemRight = itemLeft + item.offsetWidth
    const visibleLeft = wrap.scrollLeft
    const visibleRight = visibleLeft + wrap.clientWidth
    const padding = 24

    if (itemLeft < visibleLeft + padding) {
      wrap.scrollTo({ left: Math.max(0, itemLeft - padding), behavior: 'smooth' })
    } else if (itemRight > visibleRight - padding) {
      wrap.scrollTo({ left: itemRight - wrap.clientWidth + padding, behavior: 'smooth' })
    }
  })
}

const selectTimelineIndex = (index: number) => {
  store.setTimelineIndex(index)
  scrollTimelineItemIntoView(index)
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
    selectTimelineIndex(currentIndex - 1)
  }
}

const scrollRight = () => {
  const currentIndex = store.timeline.currentIndex
  if (currentIndex < timelinelist.value.length - 1) {
    selectTimelineIndex(currentIndex + 1)
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

watch(() => [props.timeline, store.productMode, store.isConvectionMode], scheduleDefaultScroll, { deep: true })
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
  padding: 0;
  border: 0;
  background-color: transparent;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 100% 100%;
  cursor: pointer;
  transition: transform 0.18s ease, filter 0.18s ease, opacity 0.18s ease;
}

.axis-control:not(:disabled):hover {
  filter: drop-shadow(0 0 0.42rem rgba(91, 227, 255, 0.65)) brightness(1.16);
  transform: translateY(-0.06rem);
}

.axis-control:not(:disabled):active {
  transform: translateY(0) scale(0.94);
}

.axis-control.disabled,
.axis-control:disabled {
  opacity: 0.36;
  cursor: not-allowed;
  filter: grayscale(0.65);
}

.axis-control:focus-visible {
  outline: 1px solid rgba(255, 227, 62, 0.85);
  outline-offset: 0.15rem;
}
.axis-line-container{
  width: calc(100% - clamp(1.5rem, 1.45vw, 1.8rem) - clamp(1.5rem, 1.45vw, 1.8rem) - 1rem);
  
}
.axis-line {
  position: relative;
  height: 1.95rem;
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
  background: linear-gradient(90deg, rgba(4, 73, 144, 0.52), rgba(32, 156, 255, 0.72), rgba(4, 73, 144, 0.52));
  box-shadow: inset 0 0 0.32rem rgba(91, 227, 255, 0.18), 0 0 0.3rem rgba(12, 120, 212, 0.22);
}

.axis-item {
  position: relative;
  width: 3.4rem;
  height: 1.9rem;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: center;
  font-size: clamp(0.58rem, 1.1vw, 0.82rem);
  color: #e5f8ff;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.18s ease, transform 0.18s ease, text-shadow 0.18s ease;
}

.axis-item.convection {
  --risk-color: #52cf93;
  --risk-glow: rgba(82, 207, 147, 0.62);
  --risk-bg: rgba(82, 207, 147, 0.08);
}

.axis-item.convection::before {
  content: "";
  position: absolute;
  left: 0.08rem;
  right: 0.08rem;
  top: 0.74rem;
  bottom: -0.22rem;
  z-index: 0;
  border-bottom: 2px solid var(--risk-color);
  background: linear-gradient(180deg, rgba(31, 50, 104, 0.22), var(--risk-bg));
  box-shadow: inset 0 -0.18rem 0.48rem var(--risk-bg);
}

.axis-item.convection.risk-low {
  --risk-color: #52cf93;
  --risk-glow: rgba(82, 207, 147, 0.62);
  --risk-bg: rgba(82, 207, 147, 0.08);
}

.axis-item.convection.risk-middle {
  --risk-color: #ffda5a;
  --risk-glow: rgba(255, 218, 90, 0.62);
  --risk-bg: rgba(255, 218, 90, 0.08);
}

.axis-item.convection.risk-high {
  --risk-color: #f14b57;
  --risk-glow: rgba(241, 75, 87, 0.64);
  --risk-bg: rgba(241, 75, 87, 0.08);
}

.axis-item.convection.active::before,
.axis-item.convection:hover::before,
.axis-item.convection:focus-visible::before {
  background: linear-gradient(180deg, rgba(39, 58, 119, 0.14), var(--risk-bg));
  box-shadow: inset 0 -0.2rem 0.58rem var(--risk-bg), 0 0 0.72rem var(--risk-glow);
}

.axis-item.convection .diamond,
.axis-item.convection .label {
  position: relative;
  z-index: 1;
}

.axis-item:hover,
.axis-item:focus-visible {
  color: #fff;
  transform: translateY(-0.08rem);
}

.axis-item:focus-visible {
  outline: none;
}

.axis-item:active {
  transform: translateY(0) scale(0.96);
}

.diamond {
  position: relative;
  display: block;
  width: 0.37rem;
  height: 0.37rem;
  margin: 0.24rem auto 0.24rem;
  transform: rotate(45deg);
  background: #c9edff;
  box-shadow: 0 0 0.5rem rgba(92, 213, 255, 0.9);
  transition: width 0.18s ease, height 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
  animation: axis-diamond-glow 2.8s ease-in-out infinite;
  animation-delay: var(--axis-delay, 0s);
}

.diamond::before,
.diamond::after {
  content: "";
  position: absolute;
  inset: -0.18rem;
  border: 1px solid rgba(91, 227, 255, 0.24);
  opacity: 0.12;
  pointer-events: none;
}

.diamond::after {
  inset: -0.32rem;
  border-color: rgba(91, 227, 255, 0.12);
}

.axis-item:hover .diamond,
.axis-item:focus-visible .diamond {
  background: #f5fbff;
  filter: brightness(1.15);
  box-shadow: 0 0 0.85rem rgba(91, 227, 255, 0.95), 0 0 0.35rem rgba(255, 255, 255, 0.52);
}

.axis-item:hover .label,
.axis-item:focus-visible .label {
  color: #fff;
  text-shadow: 0 0 0.48rem rgba(91, 227, 255, 0.78);
}

.axis-item.active .diamond {
  width: 0.48rem;
  height: 0.48rem;
  margin-top: 0.21rem;
  background: #ffe33e;
  box-shadow: 0 0 1rem rgba(255, 215, 42, 1), 0 0 0.42rem rgba(255, 255, 255, 0.62);
  animation: axis-active-diamond 1.75s ease-in-out infinite;
}

.axis-item.active .diamond::before {
  opacity: 1;
  border-color: rgba(255, 227, 62, 0.56);
  animation: axis-diamond-ripple 1.75s ease-out infinite;
}

.axis-item.active .diamond::after {
  opacity: 1;
  border-color: rgba(255, 243, 129, 0.22);
  animation: axis-diamond-ripple 1.75s ease-out infinite 0.35s;
}

.axis-item.active .label {
  color: #fff381;
  text-shadow: 0 0 0.55rem rgba(255, 227, 62, 0.8);
}

@keyframes axis-diamond-glow {
  0%,
  100% {
    transform: rotate(45deg);
    box-shadow: 0 0 0.34rem rgba(92, 213, 255, 0.56);
    opacity: 0.82;
  }
  50% {
    transform: rotate(45deg);
    box-shadow: 0 0 0.78rem rgba(92, 213, 255, 0.96), 0 0 0.24rem rgba(255, 255, 255, 0.44);
    opacity: 1;
  }
}

@keyframes axis-active-diamond {
  0%,
  100% {
    transform: rotate(45deg) scale(0.94);
    box-shadow: 0 0 0.72rem rgba(255, 215, 42, 0.9), 0 0 0.28rem rgba(255, 255, 255, 0.52);
  }
  50% {
    transform: rotate(45deg) scale(1.14);
    box-shadow: 0 0 1rem rgba(255, 227, 62, 1), 0 0 0.48rem rgba(255, 255, 255, 0.58);
  }
}

@keyframes axis-diamond-ripple {
  0% {
    transform: scale(0.42);
    opacity: 0.62;
  }
  100% {
    transform: scale(1.45);
    opacity: 0;
  }
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

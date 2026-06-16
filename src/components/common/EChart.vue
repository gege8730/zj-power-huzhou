<template>
  <div ref="el" class="root" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ECharts } from 'echarts/core'
import { init, use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([LineChart, GridComponent, CanvasRenderer])

const props = defineProps<{
  option: Record<string, unknown>
}>()

const el = ref<HTMLDivElement | null>(null)
let chart: ECharts | null = null
let ro: ResizeObserver | null = null

function render() {
  if (!chart) return
  chart.setOption(props.option as any, { notMerge: true, lazyUpdate: true })
}

onMounted(() => {
  if (!el.value) return
  chart = init(el.value, undefined, { renderer: 'canvas' })
  render()

  ro = new ResizeObserver(() => {
    chart?.resize()
  })
  ro.observe(el.value)
})

watch(
  () => props.option,
  () => render(),
  { deep: true },
)

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null

  chart?.dispose()
  chart = null
})
</script>

<style lang="less" scoped>
.root {
  width: 100%;
  height: 100%;
}
</style>

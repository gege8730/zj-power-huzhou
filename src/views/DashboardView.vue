<template>
  <div class="screen-root">
    <div class="dashboard">
      <div class="app-layer" :class="{ 'map-fullscreen': layoutStore.isMapFullscreen }" v-if="initData">
        <TopHeader />
        <LeftSidebar :factors="store.factors" :forecast-text="initData.forecastText" :days="initData.forecastDays" />
        <MapStage :title="initData.mapTitle" :query-placeholder="initData.queryPlaceholder" :toolbar="initData.toolbar"
          :active-toolbar="initData.activeToolbar" :layer-groups="initData.layerGroups" :timeline="initData.timeline" />
        <RightSidebar :warning="initData.warning" :similar-days="initData.similarDays"
          :similar-date="similarDate"
          :material-tabs="initData.materialTabs" :material-files="initData.materialFiles"
          @preview-material="handlePreviewMaterial" />
        <PdfPreviewDialog
          v-model="pdfPreviewVisible"
          :file="previewFile"
          :files="initData.materialFiles"
          :tabs="initData.materialTabs"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TopHeader from '../components/common/TopHeader.vue'
import LeftSidebar from '../components/left/LeftSidebar.vue'
import MapStage from '../components/center/MapStage.vue'
import RightSidebar from '../components/right/RightSidebar.vue'
import PdfPreviewDialog from '../components/common/PdfPreviewDialog.vue'
import rawMock from '../mock/dashboard.json'
import { onMounted, ref, watch } from 'vue'
import { getTimeList, hzSmailDay, getDqByHz, dayForecast } from '@/api/weather'
import type { DashboardMock, MaterialFile } from '../types/dashboard'
import { ElMessage } from 'element-plus'
import 'element-plus/theme-chalk/el-message.css'
import { useLayoutStore, useMapStore } from '@/store'
import dayjs from 'dayjs'

const store = useMapStore()
const layoutStore = useLayoutStore()
const initData = ref(rawMock as unknown as DashboardMock)
const similarDate = ref('相似日')
const pdfPreviewVisible = ref(false)
const previewFile = ref<MaterialFile | null>(null)

const handlePreviewMaterial = (file: MaterialFile) => {
  if (!file.pdfUrl && !file.filePath) {
    ElMessage.warning('当前材料暂无可预览 PDF')
    return
  }

  previewFile.value = file
  pdfPreviewVisible.value = true
}
// 时间轴获取
const fetchData = async () => {
  // 判断 ele 参数是否为空字符串
  if (store.timelineParams.ele === '') {
    console.warn('当前要素参数为空，无法获取时间列表')
    store.initTimeline([])
    ElMessage.warning('该要素还在开发中')
    return
  }
  await getTimeList(store.timelineParams).then((response) => {
    const duration = store.currentFactor.eleDuration[store.currentOptionIndex]
    let timeline = response.DS

    // 根据当前选择的要素和时间跨度过滤时间列表
    if (store.isForecastMode) {
      timeline = filterForecastTimeline(timeline, duration)
    } else if (duration === 'H') {
      // 只要整点数据
      timeline = timeline.filter((item: any) => dayjs(item.dateTime).minute() === 0)
    } else if (duration === 'D' || duration === '24H') {
      // 按天为跨度，取相同小时点的数据（如每天15时）
      if (timeline.length > 0) {
        // 升序排列时用最后一个元素（最新的）
        const latestItem = timeline[timeline.length - 1]
        const targetHour = dayjs(latestItem.dateTime).hour()
        // 过滤出相同小时点的数据
        timeline = timeline.filter((item: any) => dayjs(item.dateTime).hour() === targetHour)
      }
    }
    // 其他跨度（如15MIN、10MIN）不做处理

    initData.value.timeline = timeline
    store.initTimeline(timeline)
  })
}

function filterForecastTimeline(timeline: any[], duration: string) {
  const start = parseTimelineParamTime(store.timelineParams.startTime)
  const durationHours = getDurationHours(duration)
  if (!start.isValid()) return timeline

  if (duration === 'D' || duration === '24H') {
    return filterDailyForecastTimeline(timeline, start)
  }

  return timeline
    .filter((item: any) => dayjs(item.dateTime).minute() === 0)
}

function filterDailyForecastTimeline(timeline: any[], start: dayjs.Dayjs) {
  const validTimeline = timeline.filter((item: any) => {
    const current = dayjs(item.dateTime)
    return current.isValid() && current.minute() === 0 && current.isAfter(start)
  })

  if (!validTimeline.length) return []

  const targetHour = dayjs(validTimeline[0].dateTime).hour()
  const dailyMap = new Map<string, any>()

  validTimeline.forEach((item: any) => {
    const current = dayjs(item.dateTime)
    const dayKey = current.format('YYYY-MM-DD')

    if (current.hour() === targetHour && !dailyMap.has(dayKey)) {
      dailyMap.set(dayKey, item)
    }
  })

  return Array.from(dailyMap.values())
}

function parseTimelineParamTime(value: string) {
  const time = String(value || '').replace(/\D/g, '')
  if (time.length < 10) return dayjs('')
  return dayjs(`${time.slice(0, 4)}-${time.slice(4, 6)}-${time.slice(6, 8)} ${time.slice(8, 10)}:${time.slice(10, 12) || '00'}:00`)
}

function getDurationHours(duration: string) {
  if (duration === 'D' || duration === '24H') return 24
  if (duration.endsWith('H')) return Number(duration.replace('H', '')) || 1
  return 1
}

/** 初始化应用数据：相似日、短期预报、15天预报、当前预警 */
const initAppData = async () => {
  try {
    // 并行请求所有初始化数据
    const [similarRes, dqRes, forecastRes] = await Promise.allSettled([
      hzSmailDay({ type: 'month' }),
      getDqByHz(),
      dayForecast({ lat: '30.894408', lon: '120.086728' }),
    ])
    console.log('similarRes:', similarRes)
    console.log('dqRes:', dqRes)
    console.log('forecastRes:', forecastRes)

    // 相似日数据（跳过第一条当日数据，取后面3条）
    if (similarRes.status === 'fulfilled' && similarRes.value?.DS) {
      const rawList = similarRes.value.DS as any[]
      console.log('hzSmailDay 原始数据:', rawList)
      // 取第一条的日期作为标题
      const firstDt = String(rawList[0]?.datetime || '')
      if (firstDt.length >= 8) {
        similarDate.value = `${firstDt.slice(4, 6)}月${firstDt.slice(6, 8)}日相似日`
      }
      const mappedList = rawList.slice(1, 4).map((item: any) => {
        const dt = String(item.datetime || '')
        return {
          date: `${dt.slice(4, 6)}月${dt.slice(6, 8)}日`,
          percent: parseInt(String(item.smillar || '0').replace('%', '')),
          high: parseFloat(String(item.tmax ?? '0')) / 10,
          low: parseFloat(String(item.tmin ?? '0')) / 10,
          rain: parseFloat(String(item.r24 ?? '0')),
        }
      })
      console.log('hzSmailDay 映射后数据:', mappedList)
      initData.value.similarDays = mappedList
    } else {
      console.warn('获取相似日失败:', (similarRes as PromiseRejectedResult).reason)
    }

    // 短期预报文本
    if (dqRes.status === 'fulfilled' && dqRes.value?.DS) {
      initData.value.forecastText = dqRes.value.DS
    } else {
      console.warn('获取短期预报失败:', (dqRes as PromiseRejectedResult).reason)
    }

    // 15天预报（取前7天）
    if (forecastRes.status === 'fulfilled' && forecastRes.value?.DS) {
      initData.value.forecastDays = (forecastRes.value.DS as any[]).slice(0, 7)
    } else {
      console.warn('获取15天预报失败:', (forecastRes as PromiseRejectedResult).reason)
    }
  } catch (e) {
    console.error('初始化应用数据失败:', e)
  }
}

onMounted(async () => {
  await initAppData()
  await store.loadCurrentColorConfig()
  await fetchData()
})
watch(() => [store.currentSelection, store.productMode], async (newLabel) => {
  console.log('当前选择的标签:', newLabel, store.timelineParams);
  initData.value.mapTitle = store.maptitle
  await store.loadCurrentColorConfig()
  await fetchData()
});
watch(() => store.maptitle, async (newLabel) => {
  initData.value.mapTitle = newLabel
}, { immediate: true });
</script>

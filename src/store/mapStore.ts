import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { getDataFile, seBiaoByCategory } from '@/api/weather'

/** 要素类型 */
export type FactorType = 'temperature' | 'precipitation' | 'wind' | 'visibility' | 'humidity' | 'cloud' | 'radiation' | 'convection'

/** 产品模式 */
export type ProductMode = 'live' | 'forecast'

/** 要素配置 */
export interface FactorConfig {
  /** 要素类型 */
  type: FactorType
  /** 要素名称 */
  name: string
  /** 要素选项 */
  options: string[]
  /** 对应的网格选项标识（用于生成数据URL） */
  ele: string[]
  /** 对应的自动站选项标识，自动站与网格接口 ele 不完全一致 */
  stationEle: string[]
  /** 要素选项对应的时间颗粒度 */
  eleDuration: string[]
  /** 数据文件路径模板，如 '/sample/{factor}_{time}.json' */
  dataUrlTemplate?: string
}

/** 色标项 */
export interface LegendColorStop {
  value: number
  color: string
}

/** 色标接口返回的单项配置 */
export interface SebiaoConfigItem {
  alias?: string[]
  unit?: string
  stops?: LegendColorStop[]
  [key: string]: any
}

/** 当前地图和图例统一使用的色标配置 */
export interface MapColorConfig {
  fieldName: string
  unit?: string
  alias?: string[]
  stops: LegendColorStop[]
}

/** 时间轴数据 */
export interface TimelineData {
  /** 时间标签列表 */
  labels: Array<{ dateTime: string; filePath: string }>
  /** 当前选中的时间索引 */
  currentIndex: number
  /** 当前选中的时间 */
  currentLabel: { dateTime: string; filePath: string }
}

/** 地图渲染数据 */
export interface MapRenderData {
  /** 网格数据 */
  gridData: any | null
  /** 边界数据 */
  boundaryData: any | null
  /** 颜色配置 */
  colorConfig: MapColorConfig | null
  /** 是否加载中 */
  loading: boolean
  /** 最后更新时间 */
  lastUpdateTime: string | null
  /** 错误信息 */
  error: string | null
}

/** 刷新状态 */
export interface RefreshState {
  /** 是否正在刷新 */
  isRefreshing: boolean
  /** 自动刷新间隔（毫秒），0表示不自动刷新 */
  autoRefreshInterval: number
  /** 上次刷新时间 */
  lastRefreshTime: string | null
  /** 刷新次数 */
  refreshCount: number
}

const LIVE_FACTORS: FactorConfig[] = [
  { type: 'temperature', name: '气温', options: ['整点', '日最高', '日最低'], ele: ['10MIN_T', 'TH24', 'TL24'], stationEle: ['T1', 'TH24', 'TL24_'], eleDuration: ['H', 'D', 'D'], dataUrlTemplate: '/sample/temp_{option}_{time}.json' },
  { type: 'precipitation', name: '降水', options: ['1h', '3h', '6h', '12h', '24h'], ele: ['R', 'R3', 'R6', 'R12', 'R24'], stationEle: ['R1', 'R3', 'R6', 'R12', 'R24'], eleDuration: ['H', 'H', 'H', 'H', 'H'], dataUrlTemplate: '/sample/rain_{option}_{time}.json' },
  { type: 'wind', name: '风', options: ['极大风', '平均风', '12h极大风'], ele: ['EXMAXWINDV', '', 'FEXMAX24'], stationEle: ['WSIM1', '', ''], eleDuration: ['H', 'H', 'H'], dataUrlTemplate: '/sample/wind_{option}_{time}.json' },
  { type: 'visibility', name: '能见度', options: ['整点', '日最小'], ele: ['VIS', 'VIS24'], stationEle: ['VIS1', 'VIS24'], eleDuration: ['H', 'D'], dataUrlTemplate: '/sample/vis_{option}_{time}.json' },
  { type: 'humidity', name: '相对湿度', options: ['整点', '平均', '日最小'], ele: ['', '', ''], stationEle: ['', '', ''], eleDuration: ['H', 'H', 'D'], dataUrlTemplate: '/sample/rh_{option}_{time}.json' },
  { type: 'cloud', name: '云量', options: ['逐小时'], ele: [''], stationEle: [''], eleDuration: ['H'], dataUrlTemplate: '/sample/cloud_{time}.json' },
  { type: 'radiation', name: '辐射', options: ['逐15分钟'], ele: [''], stationEle: [''], eleDuration: ['15MIN'], dataUrlTemplate: '/sample/radiation_{time}.json' },
  { type: 'convection', name: '强对流', options: ['综合', '暴雨', '雷电', '大风'], ele: ['', '', '', ''], stationEle: ['', '', '', ''], eleDuration: ['10MIN', '10MIN', '10MIN', '10MIN'], dataUrlTemplate: '/sample/convection_{option}_{time}.json' },
]

const FORECAST_FACTORS: FactorConfig[] = [
  { type: 'temperature', name: '气温', options: ['整点', '日最高', '日最低'], ele: ['T', 'TMax24', 'TMin24'], stationEle: ['', '', ''], eleDuration: ['H', 'D', 'D'], dataUrlTemplate: '/sample/temp_{option}_{time}.json' },
  { type: 'precipitation', name: '降水', options: ['1h', '3h', '6h', '12h', '24h'], ele: ['Pr01', 'Pr03', 'Pr06', 'Pr12', 'Pr24'], stationEle: ['', '', '', '', ''], eleDuration: ['H', '3H', '6H', '12H', '24H'], dataUrlTemplate: '/sample/rain_{option}_{time}.json' },
  { type: 'wind', name: '风', options: ['1h', '12h', '24h'], ele: ['', '', ''], stationEle: ['', '', ''], eleDuration: ['H', '12H', '24H'], dataUrlTemplate: '/sample/wind_{option}_{time}.json' },
  { type: 'visibility', name: '能见度', options: ['3h'], ele: ['Vis3'], stationEle: [''], eleDuration: ['3H'], dataUrlTemplate: '/sample/vis_{option}_{time}.json' },
  { type: 'humidity', name: '相对湿度', options: ['1h'], ele: ['Rh'], stationEle: [''], eleDuration: ['H'], dataUrlTemplate: '/sample/rh_{option}_{time}.json' },
  { type: 'cloud', name: '云量', options: ['逐小时'], ele: [''], stationEle: [''], eleDuration: ['H'], dataUrlTemplate: '/sample/cloud_{time}.json' },
]

function cloneFactors(factors: FactorConfig[]) {
  return factors.map((item) => ({
    ...item,
    options: [...item.options],
    ele: [...item.ele],
    stationEle: [...item.stationEle],
    eleDuration: [...item.eleDuration],
  }))
}

export const useMapStore = defineStore('map', () => {
  // ==================== 要素状态 ====================
  /** 产品模式：实况 / 预报 */
  const productMode = ref<ProductMode>('live')

  /** 要素配置列表 */
  const factors = ref<FactorConfig[]>(cloneFactors(LIVE_FACTORS))

  /** 当前选中的主要素类型 */
  const currentFactorType = ref<FactorType>('temperature')

  /** 当前选中索引（如 '0-0' 表示第1个要素的第1个选项） */
  const currentSelection = ref('0-0')

  /** 是否预报模式 */
  const isForecastMode = computed(() => productMode.value === 'forecast')

  /** 当前选中要素配置 */
  const currentFactor = computed(() => {
    const [factorIndex] = currentSelection.value.split('-').map(Number)
    return factors.value[factorIndex] || factors.value[0]
  })

  /** 当前选中选项索引（数组下标） */
  const currentOptionIndex = computed(() => {
    const [, optionIndex] = currentSelection.value.split('-').map(Number)
    return Number.isFinite(optionIndex) ? optionIndex : 0
  })

  /** 当前选中的选项文本 */
  const currentOption = computed(() => {
    const factor = currentFactor.value
    return factor.options[currentOptionIndex.value] || factor.options[0]
  })

  // ==================== 时间轴状态 ====================
  /** 时间轴请求参数 */
  const baseTime = ref(dayjs())
  const timelineParams = computed(() => {
    const ele = currentFactor.value.ele[currentOptionIndex.value] || ''
    const duration = currentFactor.value.eleDuration[currentOptionIndex.value] || 'H'

    if (isForecastMode.value) {
      const timeRange = getForecastTimeRange(baseTime.value, duration)
      return {
        ncType: 'RULER',
        ele,
        startTime: timeRange.startTime,
        endTime: timeRange.endTime,
      }
    }

    const startTime = () => {
      if (duration == 'H') return baseTime.value.subtract(24, 'hour').format('YYYYMMDDHH0000')
      else if (duration == 'D') return baseTime.value.subtract(30, 'day').format('YYYYMMDDHH0000')
      else if (duration == '15MIN') return baseTime.value.subtract(6, 'hour').format('YYYYMMDDHHmm00')
      else if (duration == '10MIN') return baseTime.value.subtract(2, 'hour').format('YYYYMMDDHHmm00')
      else return baseTime.value.subtract(24, 'hour').format('YYYYMMDDHH0000')
    }
    const endTime = () => {
      if (duration == 'H') return baseTime.value.format('YYYYMMDDHH0000')
      else if (duration == 'D') return baseTime.value.format('YYYYMMDDHH0000')
      else if (duration == '15MIN') return baseTime.value.format('YYYYMMDDHHmm00')
      else if (duration == '10MIN') return baseTime.value.format('YYYYMMDDHHmm00')
      else return baseTime.value.format('YYYYMMDDHH00')
    }
    const params_startTime = startTime()
    const params_endTime = endTime()
    return {
      "ncType": "METEREAL",
      "ele": ele,
      "startTime":params_startTime,
      "endTime": params_endTime
    }
  })

  /** 自动站时间轴请求参数：自动站 ncType 固定 DATAHOUSE，ele 与网格接口分开维护 */
  const stationTimelineParams = computed(() => ({
    ...timelineParams.value,
    ncType: 'DATAHOUSE',
    ele: isForecastMode.value ? '' : (currentFactor.value.stationEle[currentOptionIndex.value] || ''),
  }))
  /** 时间轴数据 */
  const timeline = ref<TimelineData>({
    labels: [],
    currentIndex: 0,
    currentLabel: { dateTime: '', filePath: '' },
  })
  // ==================== 地图数据状态 ====================
  /** 地图渲染数据 */
  const mapRenderData = ref<MapRenderData>({
    gridData: null,
    boundaryData: null,
    colorConfig: null,
    loading: false,
    lastUpdateTime: null,
    error: null,
  })
  // 地图标题
  const maptitle = computed (() => {
    if(timelineParams.value.ele == '') return '要素数据开发中...'
    const time = dayjs(timeline.value.currentLabel.dateTime)
    if (!time.isValid()) return ''

    if (isForecastMode.value) {
      return getForecastMapTitle(time)
    }

    const factor = `${currentOption.value.replace('h','小时')}${currentFactor.value.name}分布图`
    const duration = currentFactor.value.eleDuration[currentOptionIndex.value]
    let map_time
    if(duration == 'H'){
      map_time = time.format('YYYY年MM月DD日HH时')
    }else if(duration == 'D'){
      map_time = time.subtract(1,'day').format('YYYY年MM月DD日HH时')+'-'+time.format('DD日HH时')
    }else{
      map_time = time.format('YYYY年MM月DD日HH时MM分')
    }
    return `${map_time} ${factor}`
  })
  /** 要素文件内容缓存 */
  const dataCache = ref<Record<string, any>>({})

  /** 色标原始数据缓存：接口按 category 获取，切换子要素时再按 alias 匹配 */
  const colorConfigCache = ref<Record<string, SebiaoConfigItem[]>>({})

  /** 当前网格 ele，用于匹配色标 alias */
  const currentGridEle = computed(() => currentFactor.value.ele[currentOptionIndex.value] || '')

  // ==================== 刷新状态 ====================
  /** 刷新状态 */
  const refreshState = ref<RefreshState>({
    isRefreshing: false,
    autoRefreshInterval: 0,
    lastRefreshTime: null,
    refreshCount: 0,
  })

  // ==================== Actions ====================

  async function setNewFactorOption(type: FactorType, optionIndex: number) {
    let [factorIndex] = currentSelection.value.split('-').map(Number)
    if (currentFactorType.value != type){
      currentFactorType.value = type
      factorIndex = factors.value.findIndex(f => f.type === type)
    }
    if (factorIndex < 0) factorIndex = 0
    currentSelection.value = `${factorIndex}-${optionIndex}`
    mapRenderData.value.colorConfig = null
    console.log(`切换到要素 ${type}，选项索引 ${currentSelection.value}`)
  }

  /** 设置产品模式 */
  function setProductMode(mode: ProductMode) {
    if (productMode.value === mode) return

    productMode.value = mode
    factors.value = cloneFactors(mode === 'forecast' ? FORECAST_FACTORS : LIVE_FACTORS)
    currentFactorType.value = factors.value[0]?.type || 'temperature'
    currentSelection.value = '0-0'
    setTimelineLabels([])
    mapRenderData.value.gridData = null
    mapRenderData.value.colorConfig = null
    mapRenderData.value.error = null
    clearCache()
  }

  /**
   * 设置当前时间索引
   */
  function setTimelineIndex(index: number) {
    if (index >= 0 && index < timeline.value.labels.length) {
      timeline.value.currentIndex = index
      timeline.value.currentLabel = timeline.value.labels[index]
      // 刷新地图数据
      refreshMapData()
    }
  }

  /**
   * 设置时间轴标签（初始化或更新）
   */
  function setTimelineLabels(labels: Array<{ dateTime: string; filePath: string }>) {
    timeline.value.labels = labels

    if (!labels.length) {
      timeline.value.currentIndex = 0
      timeline.value.currentLabel = { dateTime: '', filePath: '' }
      return
    }

    const defaultIndex = isForecastMode.value ? 0 : labels.length - 1
    timeline.value.currentIndex = defaultIndex
    timeline.value.currentLabel = labels[defaultIndex]
  }

  /**
   * 手动刷新地图数据
   */
  async function refreshMapData() {
    const factor = currentFactor.value
    const currentTimeFile = timeline.value.currentLabel.filePath
    if(timelineParams.value.ele == ''){
      mapRenderData.value.error = '当前要素数据开发中，暂无数据可展示'
      mapRenderData.value.gridData = null
      return
    }
    if (!currentTimeFile) {
      mapRenderData.value.gridData = null
      return
    }
    // 构建缓存key
    const cacheKey = `${productMode.value}_${factor.type}_${currentOption.value}_${currentTimeFile}`

    // 检查缓存
    if (dataCache.value[cacheKey]) {
      mapRenderData.value.gridData = dataCache.value[cacheKey]
      mapRenderData.value.lastUpdateTime = new Date().toISOString()
      return
    }

    // 加载数据
    mapRenderData.value.loading = true
    mapRenderData.value.error = null

    try {
      // 根据要素类型和选项获取数据
      const dataUrl = await generateData(currentTimeFile)
      console.log(dataUrl,'map')
      const data = dataUrl
      // 缓存数据
      dataCache.value[cacheKey] = data
      mapRenderData.value.gridData = data
      mapRenderData.value.lastUpdateTime = new Date().toISOString()

      // 更新刷新状态
      refreshState.value.lastRefreshTime = new Date().toISOString()
      refreshState.value.refreshCount++
    } catch (error: any) {
      mapRenderData.value.error = error.message || '加载数据失败'
      console.error('Failed to refresh map data:', error)
    } finally {
      mapRenderData.value.loading = false
    }
  }

  /**
   * 获取网格数据
   */
  async function generateData (filePath: string) {
    const params = {
      filePath: filePath,
      region: '330500'
    }
    const res = await getDataFile(params)
    return res.DS
  }

  /**
   * 手动刷新
   */
  async function manualRefresh() {
    refreshState.value.isRefreshing = true
    try {
      await refreshMapData()
    } finally {
      refreshState.value.isRefreshing = false
    }
  }

  /**
   * 设置自动刷新
   */
  function setAutoRefresh(intervalMs: number) {
    refreshState.value.autoRefreshInterval = intervalMs

    // 如果已经有定时器，先清除
    if ((refreshState as any)._autoRefreshTimer) {
      clearInterval((refreshState as any)._autoRefreshTimer)
        ; (refreshState as any)._autoRefreshTimer = null
    }

    // 设置新的定时器
    if (intervalMs > 0) {
      (refreshState as any)._autoRefreshTimer = setInterval(() => {
        manualRefresh()
      }, intervalMs)
    }
  }

  /**
   * 设置边界数据
   */
  function setBoundaryData(data: any) {
    mapRenderData.value.boundaryData = data
  }

  /**
   * 设置颜色配置
   */
  function setColorConfig(config: MapColorConfig | null) {
    mapRenderData.value.colorConfig = config
  }

  /**
   * 根据当前要素从接口获取色标，并按当前 ele 匹配 alias。
   * 若没有 alias 匹配项，则使用该 category 返回的第一条色标。
   */
  async function loadCurrentColorConfig() {
    const category = currentFactor.value.type
    if (!category || !currentGridEle.value) {
      setColorConfig(null)
      return null
    }

    try {
      let list = colorConfigCache.value[category]
      if (!list) {
        const response = await seBiaoByCategory({ category })
        list = normalizeSebiaoList(response.DS)
        colorConfigCache.value[category] = list
      }

      const matched = pickSebiaoConfig(list, currentGridEle.value)
      const config = buildMapColorConfig(matched, currentGridEle.value)
      setColorConfig(config)
      return config
    } catch (error) {
      console.error('色标配置加载失败:', error)
      setColorConfig(null)
      return null
    }
  }

  /**
   * 清除缓存
   */
  function clearCache() {
    dataCache.value = {}
  }

  /**
   * 清除错误
   */
  function clearError() {
    mapRenderData.value.error = null
  }

  // ==================== 初始化 ====================

  /**
   * 初始化时间轴数据
   */
  async function initTimeline(initialLabels: Array<{ dateTime: string; filePath: string }>) {
    setTimelineLabels(initialLabels)
    await refreshMapData()
  }

  function getForecastMapTitle(selectedTime: Dayjs) {
    const start = getForecastStartTime(baseTime.value, currentFactor.value.eleDuration[currentOptionIndex.value] || 'H')
    const durationHours = getDurationHours(currentFactor.value.eleDuration[currentOptionIndex.value] || 'H')
    const end = selectedTime
    const startText = end.subtract(durationHours, 'hour').format('YYYY年MM月DD日HH时')
    const endText = end.format('DD日HH时')
    const durationText = durationHours > 1 ? `${durationHours}小时` : ''
    const factorName = `${durationText}${currentFactor.value.name}预报图`
    return `${startText}-${endText} ${factorName}`
  }

  return {
    // 状态
    factors,
    productMode,
    isForecastMode,
    currentFactorType,
    currentSelection,
    currentFactor,
    currentOptionIndex,
    currentOption,
    currentGridEle,
    timelineParams,
    stationTimelineParams,
    timeline,
    baseTime,
    mapRenderData,
    refreshState,
    dataCache,
    colorConfigCache,
    maptitle,

    // Actions
    setProductMode,
    setTimelineIndex,
    setTimelineLabels,
    refreshMapData,
    manualRefresh,
    setAutoRefresh,
    setBoundaryData,
    setColorConfig,
    loadCurrentColorConfig,
    clearCache,
    clearError,
    initTimeline,
    setNewFactorOption,
  }
})

function normalizeSebiaoList(source: unknown): SebiaoConfigItem[] {
  const list = Array.isArray(source) ? source : []
  return list
    .map((item: any) => ({
      ...item,
      alias: Array.isArray(item?.alias) ? item.alias.map((alias: unknown) => String(alias)) : [],
      unit: item?.unit ? String(item.unit) : '',
      stops: normalizeColorStops(item?.stops),
    }))
    .filter((item) => item.stops.length > 0)
}

function normalizeColorStops(source: unknown): LegendColorStop[] {
  if (!Array.isArray(source)) return []

  return source
    .map((item: any) => ({
      value: Number(item?.value),
      color: String(item?.color || ''),
    }))
    .filter((item) => Number.isFinite(item.value) && Boolean(item.color))
    .sort((a, b) => a.value - b.value)
}

function pickSebiaoConfig(list: SebiaoConfigItem[], ele: string) {
  if (!list.length) return null
  const target = normalizeAlias(ele)
  const matched = list.find((item) => (item.alias || []).some((alias) => normalizeAlias(alias) === target))
  return matched || list[0]
}

function buildMapColorConfig(item: SebiaoConfigItem | null, ele: string): MapColorConfig | null {
  if (!item?.stops?.length) return null

  return {
    fieldName: ele || item.alias?.[0] || 'value',
    unit: item.unit || '',
    alias: item.alias || [],
    stops: item.stops,
  }
}

function normalizeAlias(value: string) {
  return String(value || '').trim().toUpperCase()
}

function getForecastTimeRange(time: Dayjs, duration: string) {
  const start = getForecastStartTime(time, duration)
  const durationHours = getDurationHours(duration)
  const end = duration === 'D' || duration === '24H'
    ? start.add(23, 'day')
    : start.add(durationHours * 23, 'hour')

  return {
    startTime: start.format('YYYYMMDDHH0000'),
    endTime: end.format('YYYYMMDDHH0000'),
  }
}

function getForecastStartTime(time: Dayjs, duration: string) {
  if (duration === 'H') return time.startOf('hour')
  if (duration === 'D' || duration === '24H') return time.startOf('hour')

  // 预报产品按最近完成的 3 小时时段作为起报时间：0-2、3-5、6-8...
  // 例如当前 15 时，最近完成时段为 12-14，起报时间取 14 时。
  const completedCycleEnd = time.subtract(1, 'hour')
  const cycleEndHour = Math.floor(completedCycleEnd.hour() / 3) * 3 + 2
  return completedCycleEnd.hour(cycleEndHour).minute(0).second(0).millisecond(0)
}

function getDurationHours(duration: string) {
  if (duration === 'D' || duration === '24H') return 24
  if (duration.endsWith('H')) return Number(duration.replace('H', '')) || 1
  return 1
}

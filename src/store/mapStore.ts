import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import {getDataFile} from '@/api/weather'

/** 要素类型 */
export type FactorType = 'temperature' | 'precipitation' | 'wind' | 'visibility' | 'humidity' | 'cloud' | 'radiation' | 'convection'

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
  colorConfig: any | null
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

export const useMapStore = defineStore('map', () => {
  // ==================== 要素状态 ====================
  /** 要素配置列表 */
  const factors = ref<FactorConfig[]>([
    { type: 'temperature', name: '气温', options: ['整点', '日最高', '日最低'], ele: ['10MIN_T', 'TH24', 'TL24'], stationEle: ['T1', 'TH24', 'TL24_'], eleDuration: ['H', 'D', 'D'], dataUrlTemplate: '/sample/temp_{option}_{time}.json' },
    { type: 'precipitation', name: '降水', options: ['1h', '3h', '6h', '12h', '24h'], ele: ['R', 'R3', 'R6', 'R12', 'R24'], stationEle: ['R1', 'R3', 'R6', 'R12', 'R24'], eleDuration: ['H', 'H', 'H', 'H', 'H'], dataUrlTemplate: '/sample/rain_{option}_{time}.json' },
    { type: 'wind', name: '风', options: ['极大风', '平均风', '12h极大风'], ele: ['EXMAXWINDV', '', 'FEXMAX24'], stationEle: ['WSIM1', '', ''], eleDuration: ['H', 'H', 'H'], dataUrlTemplate: '/sample/wind_{option}_{time}.json' },
    { type: 'visibility', name: '能见度', options: ['整点', '日最小'], ele: ['VIS', 'VIS24'], stationEle: ['VIS1', 'VIS24'], eleDuration: ['H', 'D'], dataUrlTemplate: '/sample/vis_{option}_{time}.json' },
    { type: 'humidity', name: '相对湿度', options: ['整点', '平均', '日最小'], ele: ['', '', ''], stationEle: ['', '', ''], eleDuration: ['H', 'H', 'D'], dataUrlTemplate: '/sample/rh_{option}_{time}.json' },
    { type: 'cloud', name: '云量', options: ['逐小时'], ele: [''], stationEle: [''], eleDuration: ['H'], dataUrlTemplate: '/sample/cloud_{time}.json' },
    { type: 'radiation', name: '辐射', options: ['逐15分钟'], ele: [''], stationEle: [''], eleDuration: ['15MIN'], dataUrlTemplate: '/sample/radiation_{time}.json' },
    { type: 'convection', name: '强对流', options: ['综合', '暴雨', '雷电', '大风'], ele: ['', '', '', ''], stationEle: ['', '', '', ''], eleDuration: ['10MIN', '10MIN', '10MIN', '10MIN'], dataUrlTemplate: '/sample/convection_{option}_{time}.json' },
  ])

  /** 当前选中的主要素类型 */
  const currentFactorType = ref<FactorType>('temperature')

  /** 当前选中索引（如 '0-0' 表示第1个要素的第1个选项） */
  const currentSelection = ref('0-0')

  /** 当前选中要素配置 */
  const currentFactor = computed(() => {
    const [factorIndex] = currentSelection.value.split('-').map(Number)
    return factors.value[factorIndex]
  })

  /** 当前选中选项索引（数组下标） */
  const currentOptionIndex = computed(() => {
    const [, optionIndex] = currentSelection.value.split('-').map(Number)
    return optionIndex
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
    const ele = currentFactor.value.ele[currentOptionIndex.value]
    const duration = currentFactor.value.eleDuration[currentOptionIndex.value]
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
    ele: currentFactor.value.stationEle[currentOptionIndex.value] || '',
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
    const factor = `${currentOption.value.replace('h','小时')}${currentFactor.value.name}分布图`
    const duration = currentFactor.value.eleDuration[currentOptionIndex.value]
    let time = dayjs(timeline.value.currentLabel.dateTime)
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
    currentSelection.value = `${factorIndex}-${optionIndex}`
    console.log(`切换到要素 ${type}，选项索引 ${currentSelection.value}`)
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
    const lastIndex = labels.length - 1
    timeline.value.currentIndex = lastIndex >= 0 ? lastIndex : 0
    timeline.value.currentLabel = labels[lastIndex] || labels[0] || ''
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
    // 构建缓存key
    const cacheKey = `${factor.type}_${currentOption.value}_${currentTimeFile}`

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
  function setColorConfig(config: any) {
    mapRenderData.value.colorConfig = config
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

  return {
    // 状态
    factors,
    currentFactorType,
    currentSelection,
    currentFactor,
    currentOptionIndex,
    currentOption,
    timelineParams,
    stationTimelineParams,
    timeline,
    baseTime,
    mapRenderData,
    refreshState,
    dataCache,
    maptitle,

    // Actions
    setTimelineIndex,
    setTimelineLabels,
    refreshMapData,
    manualRefresh,
    setAutoRefresh,
    setBoundaryData,
    setColorConfig,
    clearCache,
    clearError,
    initTimeline,
    setNewFactorOption,
  }
})

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { getDataFile, seBiaoByCategory } from '@/api/weather'
import { downloadScmocGridFile, getScmocGridData, getScmocGridFileList } from '@/api/convection'
import type { ScmocGridExtent, ScmocGridFile } from '@/api/convection'

/** 要素类型 */
export type FactorType = 'temperature' | 'precipitation' | 'wind' | 'visibility' | 'humidity' | 'cloud' | 'radiation' | 'convection'

/** 产品模式 */
export type ProductMode = 'live' | 'forecast'

/** 页面场景：常规气象要素 / 强对流专题 */
export type DashboardScene = 'home' | 'convection'

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
  /** 强对流 SCMOC 产品编码；有值时使用预生成 PNG 产品图 */
  scmocProdCode?: string[]
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

export type ConvectionRiskLevel = 0 | 1 | 2
export type ConvectionRiskType = 'composite' | 'rain' | 'wind'
const CONVECTION_RISK_TYPES: ConvectionRiskType[] = ['composite', 'rain', 'wind']

export interface ShortTermWarningHour {
  time?: string
  risk?: string | number
}

export interface ShortTermWarningTown {
  town?: string
  name?: string
  risk?: string | number
  level?: string | number
  hours?: ShortTermWarningHour[]
  [key: string]: any
}

export interface ShortTermWarningData {
  observeTime?: string
  time?: string
  warning?: ShortTermWarningTown[]
  [key: string]: any
}

export interface ConvectionRenderData {
  observeTime: string
  timeline: Array<{ dateTime: string; filePath: string }>
  frames: Record<string, Record<string, ConvectionRiskLevel>>
}

export interface ConvectionProductImage {
  blob: Blob
  filePath: string
  ptime: string
  validTime: number
}

/** 地图渲染数据 */
export interface MapRenderData {
  /** 网格数据 */
  gridData: any | null
  convectionData: ConvectionRenderData | null
  /** 强对流 SCMOC 预生成产品图 */
  convectionProductImage: ConvectionProductImage | null
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
  { type: 'wind', name: '风', options: ['极大风',  '12h极大风'], ele: ['EXMAXWINDV', 'FEXMAX24'], stationEle: ['WSIM1',  ''], eleDuration: ['H', 'H'], dataUrlTemplate: '/sample/wind_{option}_{time}.json' },
  { type: 'visibility', name: '能见度', options: ['整点', '日最小'], ele: ['VIS', 'VIS24'], stationEle: ['VIS1', 'VIS24'], eleDuration: ['H', 'D'], dataUrlTemplate: '/sample/vis_{option}_{time}.json' },
  { type: 'humidity', name: '相对湿度', options: ['整点',], ele: ['10MIN_RELH',], stationEle: ['RH1'], eleDuration: ['H'], dataUrlTemplate: '/sample/rh_{option}_{time}.json' },
  { type: 'radiation', name: '辐射', options: ['逐15分钟'], ele: ['OSS_RADIATION'], stationEle: [''], eleDuration: ['15MIN'], dataUrlTemplate: '/sample/radiation_{time}.json' },
  // { type: 'convection', name: '强对流', options: ['综合', '暴雨', '雷电', '大风'], ele: ['CONVECTION', 'CONVECTION', 'CONVECTION', 'CONVECTION'], stationEle: ['', '', '', ''], eleDuration: ['10MIN', '10MIN', '10MIN', '10MIN'], dataUrlTemplate: '/sample/convection_{option}_{time}.json' },
]

const FORECAST_FACTORS: FactorConfig[] = [
  { type: 'temperature', name: '气温', options: ['整点', '日最高', '日最低'], ele: ['T', 'TMax24', 'TMin24'], stationEle: ['', '', ''], eleDuration: ['H', 'D', 'D'], dataUrlTemplate: '/sample/temp_{option}_{time}.json' },
  { type: 'precipitation', name: '降水', options: ['1h', '3h', '6h', '12h', '24h'], ele: ['Pr01', 'Pr03', 'Pr06', 'Pr12', 'Pr24'], stationEle: ['', '', '', '', ''], eleDuration: ['H', '3H', '6H', '12H', '24H'], dataUrlTemplate: '/sample/rain_{option}_{time}.json' },
  { type: 'wind', name: '风', options: ['极大风'], ele: ['WindEx'], stationEle: [''], eleDuration: ['H'], dataUrlTemplate: '/sample/wind_{option}_{time}.json' },
  { type: 'visibility', name: '能见度', options: ['3h'], ele: ['Vis3'], stationEle: [''], eleDuration: ['3H'], dataUrlTemplate: '/sample/vis_{option}_{time}.json' },
  { type: 'humidity', name: '相对湿度', options: ['1h'], ele: ['Rh'], stationEle: [''], eleDuration: ['H'], dataUrlTemplate: '/sample/rh_{option}_{time}.json' },
  { type: 'cloud', name: '云量', options: ['逐小时'], ele: ['OSS_CLOUD'], stationEle: [''], eleDuration: ['H'], dataUrlTemplate: '/sample/cloud_{time}.json' },
]

/**
 * 强对流专题要素清单。
 * 「风险」的综合/暴雨/大风共用短临告警接口，暴雨、大风暂为 mock，其余产品的 ele 留空，
 * 由 DashboardView 统一提示“该产品开发中”。
 */
const CONVECTION_FACTORS: FactorConfig[] = [
  { type: 'convection', name: '风险', options: ['综合', '暴雨', '大风'], ele: ['STRONGCONV_COMPOSITE', 'STRONGCONV_RAIN', 'STRONGCONV_WIND'], stationEle: ['', '', ''], eleDuration: ['10MIN', '10MIN', '10MIN'] },
  { type: 'precipitation', name: '暴雨', options: ['实况', '要素预报', '概率预报', '确定性预报'], ele: ['R', 'Pr01', '', ''], stationEle: ['R1', '', '', ''], eleDuration: ['H', 'H', 'H', 'H'], scmocProdCode: ['', '', 'SCMOC-RAT-PRO', 'SCMOC-RAT-VAL'] },
  { type: 'wind', name: '大风', options: ['实况', '要素预报', '概率预报', '确定性预报'], ele: ['EXMAXWINDV', 'WindEx', '', ''], stationEle: ['WSIM1', '', '', ''], eleDuration: ['H', 'H', 'H', 'H'], scmocProdCode: ['', '', 'SCMOC-SMG-PRO', 'SCMOC-SMG-VAL'] },
  { type: 'convection', name: '雷达', options: ['实况', '雷达外推'], ele: ['', ''], stationEle: ['', ''], eleDuration: ['H', 'H'] },
  { type: 'convection', name: '雷电', options: ['实况', '概率预报', '确定性预报'], ele: ['', '', ''], stationEle: ['', '', ''], eleDuration: ['10MIN', 'H', 'H'], scmocProdCode: ['', 'SCMOC-SSM-PRO', 'SCMOC-SSM-VAL'] },
  { type: 'convection', name: '冰雹', options: ['概率预报', '确定性预报'], ele: ['', ''], stationEle: ['', ''], eleDuration: ['H', 'H'], scmocProdCode: ['SCMOC-HAIL-PRO', 'SCMOC-HAIL-VAL'] },
]

const SCMOC_PROBABILITY_COLOR_CONFIG: MapColorConfig = {
  unit: '%',
  fieldName: 'value',
  stops: [
    { value: 0, color: '#58780c' },
    { value: 10, color: '#a4bf2e' },
    { value: 30, color: '#ffe64d' },
    { value: 50, color: '#ff9d27' },
    { value: 70, color: '#ef4d34' },
    { value: 90, color: '#b41b66' },
  ],
}

const SCMOC_LEVEL_COLOR_CONFIG: MapColorConfig = {
  unit: '等级',
  fieldName: 'value',
  stops: [
    { value: -1, color: '#58780c' },
    { value: 0, color: '#58780c' },
    { value: 1, color: '#a4bf2e' },
    { value: 2, color: '#ffe64d' },
    { value: 3, color: '#ff9d27' },
    { value: 4, color: '#ef4d34' },
  ],
}

const SCMOC_DETERMINISTIC_COLOR_CONFIG: MapColorConfig = {
  unit: '',
  fieldName: 'value',
  // 接口编码：-1 = 不出现，正数（雷电 4 / 大风 61 / 暴雨 63 等）= 出现
  stops: [
    { value: -1, color: '#f5f5f5' },
    { value: 0, color: '#e32400' },
  ],
}

export const useMapStore = defineStore('map', () => {
  // ==================== 要素状态 ====================
  /** 当前页面场景 */
  const scene = ref<DashboardScene>('home')

  /** 产品模式：实况 / 预报 */
  const productMode = ref<ProductMode>('live')

  /** 要素配置列表：强对流场景使用专题清单，常规场景按实况/预报切换 */
  const factors = computed<FactorConfig[]>(() => scene.value === 'convection'
    ? CONVECTION_FACTORS
    : productMode.value === 'forecast' ? FORECAST_FACTORS : LIVE_FACTORS)

  /** 当前选中的主要素类型 */
  const currentFactorType = ref<FactorType>('temperature')

  /** 当前选中索引（如 '0-0' 表示第1个要素的第1个选项） */
  const currentSelection = ref('0-0')

  /** 当前强对流 SCMOC 产品编码 */
  const currentScmocProdCode = computed(
    () => currentFactor.value.scmocProdCode?.[currentOptionIndex.value] || '',
  )

  /** 强对流专题使用 SCMOC 预生成 PNG 产品图的要素 */
  const isConvectionImageProduct = computed(
    () => scene.value === 'convection' && Boolean(currentScmocProdCode.value),
  )

  /** SCMOC 确定性预报使用“出现 / 不出现”二值产品编码 */
  const isConvectionDeterministicProduct = computed(
    () => isConvectionImageProduct.value && currentScmocProdCode.value.endsWith('-VAL'),
  )

  /** 强对流专题里复用常规网格产品的要素 */
  const isConvectionGridFactor = computed(
    () => scene.value === 'convection'
      && !isConvectionImageProduct.value
      && currentFactor.value.type !== 'convection',
  )

  /** 强对流风险视图：使用短临告警帧而不是网格数据 */
  const isConvectionRiskView = computed(
    () => scene.value === 'convection'
      && !isConvectionImageProduct.value
      && !isConvectionLightningLive.value
      && currentFactor.value.type === 'convection',
  )

  /** 雷电实况：直接叠加最近 10 分钟地闪点（/api/thunderList），不走网格/产品图 */
  const isConvectionLightningLive = computed(
    () => scene.value === 'convection'
      && currentFactor.value.name === '雷电'
      && currentOptionIndex.value === 0,
  )

  /** 强对流暴雨/大风「要素预报」：复用首页预报网格（Pr01 / WindEx），未来 24 小时逐小时 */
  const isConvectionGridForecast = computed(
    () => isConvectionGridFactor.value && currentOptionIndex.value === 1,
  )

  /** 强对流「风险」栏：底部提供 0-2h（实况）/ 0-24h（预报）两个标签 */
  const isConvectionRiskFactor = computed(
    () => scene.value === 'convection' && currentFactor.value.name === '风险',
  )

  /** 强对流里的要素/概率/确定性预报选项：底部标签显示“预报”，时间轴从第一档开始 */
  const isConvectionForecastOption = computed(
    () => isConvectionImageProduct.value || isConvectionGridForecast.value,
  )

  /** 是否预报模式（强对流专题里的网格要素按实况处理，仅「要素预报」选项例外） */
  const isForecastMode = computed(
    () => productMode.value === 'forecast' && (!isConvectionGridFactor.value || isConvectionGridForecast.value),
  )

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

  const isConvectionMode = computed(() => scene.value === 'convection')

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
  /** 强对流原始短临告警数据，用于在实况/预报之间重建时间轴 */
  const convectionSource = ref<ShortTermWarningData | null>(null)
  const convectionProductFiles = ref<Record<string, ScmocGridFile>>({})
  const convectionProductImageCache = ref<Record<string, Blob>>({})
  const convectionProductExtent = ref<ScmocGridExtent | null>(null)
  const convectionProductGridCache = ref<Record<string, any[]>>({})

  /** 地图渲染数据 */
  const mapRenderData = ref<MapRenderData>({
    gridData: null,
    convectionData: null,
    convectionProductImage: null,
    boundaryData: null,
    colorConfig: null,
    loading: false,
    lastUpdateTime: null,
    error: null,
  })
  // 地图标题
  const maptitle = computed (() => {
    if (isConvectionRiskView.value) {
      const time = dayjs(timeline.value.currentLabel.dateTime || mapRenderData.value.convectionData?.observeTime)
      if (currentFactor.value.name === '雷达') {
        return time.isValid() ? `${time.format('YYYY年MM月DD日HH时mm分')} 雷达实况分布图` : '雷达实况分布图'
      }
      const riskName = currentOption.value === '综合' ? '强对流' : `强对流${currentOption.value}`
      if (isForecastMode.value) {
        return time.isValid() ? `${time.format('YYYY年MM月DD日HH时')} ${riskName}风险预报图` : `${riskName}风险预报图`
      }
      return time.isValid() ? `${time.format('YYYY年MM月DD日HH时mm分')} ${riskName}风险图` : `${riskName}风险图`
    }
    if (isConvectionImageProduct.value) {
      const time = dayjs(timeline.value.currentLabel.dateTime)
      const productName = `${currentFactor.value.name}${currentOption.value}`
      return time.isValid()
        ? `${time.format('YYYY年MM月DD日HH时')} ${productName}`
        : productName
    }
    if (isConvectionLightningLive.value) return `${dayjs().minute(Math.floor(dayjs().minute() / 10) * 10).format('YYYY年MM月DD日HH时mm分')} 雷电实况分布图`
    if(timelineParams.value.ele == '') return '要素数据开发中...'
    const time = dayjs(timeline.value.currentLabel.dateTime)
    if (!time.isValid()) return ''

    if (isConvectionGridFactor.value) {
      if (isConvectionGridForecast.value) {
        return `${time.format('YYYY年MM月DD日HH时')} ${currentFactor.value.name}要素预报分布图`
      }
      const gridTitle = currentFactor.value.type === 'wind' ? '大风实况分布图' : '暴雨实况分布图'
      return `${time.format('YYYY年MM月DD日HH时')} ${gridTitle}`
    }

    if (isForecastMode.value) {
      return getForecastMapTitle(time)
    }

    if (currentFactor.value.type === 'radiation') {
      const startTime = time.subtract(15, 'minute')
      const mapTime = `${startTime.format('YYYY年M月D日HH时mm分')}-${time.format('D日HH时mm分')}`
      return `${mapTime} FY-4B辐射分布图`
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
  let mapDataRequestSerial = 0
  let colorConfigRequestSerial = 0

  /** 当前网格 ele，用于匹配色标 alias */
  const currentGridEle = computed(() => currentFactor.value.ele[currentOptionIndex.value] || '')

  const currentConvectionFrame = computed(() => {
    const data = mapRenderData.value.convectionData
    if (!data) return null
    const frameKey = timeline.value.currentLabel.filePath || data.timeline[0]?.filePath
    return frameKey ? data.frames[frameKey] ?? null : null
  })

  // ==================== 刷新状态 ====================
  /** 刷新状态 */
  const refreshState = ref<RefreshState>({
    isRefreshing: false,
    autoRefreshInterval: 0,
    lastRefreshTime: null,
    refreshCount: 0,
  })

  // ==================== Actions ====================

  /** 切换页面场景（常规 / 强对流） */
  function setScene(next: DashboardScene) {
    if (scene.value === next) return

    mapDataRequestSerial++
    colorConfigRequestSerial++
    scene.value = next
    productMode.value = 'live'
    currentFactorType.value = factors.value[0]?.type || 'temperature'
    currentSelection.value = '0-0'
    setTimelineLabels([])
    // 不再清空 gridData / colorConfig：保留旧图层直到新数据到达，
    // 避免切换场景时填充层被清掉再画回来（视觉上像“地图刷新”）
    mapRenderData.value.loading = false
    mapRenderData.value.error = null
    if (next !== 'convection') {
      convectionSource.value = null
      mapRenderData.value.convectionData = null
    }
    convectionProductFiles.value = {}
    convectionProductImageCache.value = {}
    convectionProductGridCache.value = {}
    convectionProductExtent.value = null
    mapRenderData.value.convectionProductImage = null
    clearCache()
  }

  async function setFactorOption(factorIndex: number, optionIndex: number) {
    const factor = factors.value[factorIndex]
    if (!factor) return

    const nextSelection = `${factorIndex}-${optionIndex}`
    if (currentSelection.value === nextSelection) return

    mapDataRequestSerial++
    colorConfigRequestSerial++
    currentFactorType.value = factor.type
    if (isConvectionMode.value) {
      // 风险栏由底部 0-2h / 0-24h 标签决定模式；要素预报复用预报网格，其余为实况
      if (factorIndex === 0) {
        if (currentFactor.value.name !== '风险') productMode.value = 'live'
      } else {
        productMode.value = factor.type !== 'convection' && optionIndex === 1 ? 'forecast' : 'live'
      }
    }
    currentSelection.value = nextSelection
    mapRenderData.value.colorConfig = null
    mapRenderData.value.gridData = null
    mapRenderData.value.convectionProductImage = null
    mapRenderData.value.loading = false
    if (isConvectionMode.value) {
      mapRenderData.value.convectionData = null
      setTimelineLabels([])
    } else {
      mapRenderData.value.convectionData = null
    }
    console.log(`切换到要素 ${factor.name}，选项索引 ${currentSelection.value}`)
  }

  /** 设置产品模式 */
  function setProductMode(mode: ProductMode) {
    if (productMode.value === mode) return

    mapDataRequestSerial++
    colorConfigRequestSerial++
    productMode.value = mode
    // 强对流专题的实况/预报只切换风险帧，要素与选项保持不变
    if (!isConvectionMode.value) {
      currentFactorType.value = factors.value[0]?.type || 'temperature'
      currentSelection.value = '0-0'
    }
    setTimelineLabels([])
    mapRenderData.value.gridData = null
    mapRenderData.value.convectionData = null
    mapRenderData.value.convectionProductImage = null
    mapRenderData.value.colorConfig = null
    mapRenderData.value.loading = false
    mapRenderData.value.error = null
    clearCache()
    // 强对流场景在实况/预报之间切换时，用同一份短临告警数据重建时间轴
    if (isConvectionMode.value) rebuildConvectionData()
  }

  /**
   * 设置当前时间索引
   */
  function setTimelineIndex(index: number): Promise<void> {
    if (index >= 0 && index < timeline.value.labels.length) {
      timeline.value.currentIndex = index
      timeline.value.currentLabel = timeline.value.labels[index]
      if (isConvectionRiskView.value) return Promise.resolve()
      // 刷新地图数据；返回 Promise 便于时间轴播放等到该时次加载完再切下一帧
      return refreshMapData()
    }
    return Promise.resolve()
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

    const defaultIndex = isForecastMode.value || isConvectionForecastOption.value ? 0 : labels.length - 1
    timeline.value.currentIndex = defaultIndex
    timeline.value.currentLabel = labels[defaultIndex]
  }

  /**
   * 手动刷新地图数据
   */
  async function refreshMapData() {
    const requestSerial = ++mapDataRequestSerial
    const requestProductMode = productMode.value
    const requestSelection = currentSelection.value
    const factor = currentFactor.value
    const currentTimeFile = timeline.value.currentLabel.filePath
    if (isConvectionImageProduct.value) {
      const file = convectionProductFiles.value[currentTimeFile]
      const extent = convectionProductExtent.value
      if (!file || !extent) {
        mapRenderData.value.gridData = null
        mapRenderData.value.convectionProductImage = null
        mapRenderData.value.error = file ? null : '当前强对流产品时次不存在'
        return
      }

      const gridCacheKey = [
        file.prodCode,
        file.ptime,
        extent.startLon,
        extent.startLat,
        extent.endLon,
        extent.endLat,
      ].join('_')
      mapRenderData.value.loading = true
      mapRenderData.value.error = null
      mapRenderData.value.gridData = null
      mapRenderData.value.convectionData = null

      try {
        const gridRequestParams = {
          prodCode: file.prodCode,
          ptime: file.ptime,
          ...extent,
          dataFormat: 'json',
        }
        if (file.prodCode.endsWith('-PRO') || file.prodCode.endsWith('-VAL')) {
          console.log(
            '[SCMOC] 格点接口请求参数 getNafpNwfdScmocOfGridDataByProdCodeAndTime:',
            gridRequestParams,
          )
        }
        const grids = convectionProductGridCache.value[gridCacheKey]
          || (await getScmocGridData(gridRequestParams)).DS
        if (
          requestSerial !== mapDataRequestSerial
          || requestProductMode !== productMode.value
          || requestSelection !== currentSelection.value
          || currentTimeFile !== timeline.value.currentLabel.filePath
        ) {
          return
        }
        convectionProductGridCache.value[gridCacheKey] = grids
        const rawGrid = grids[timeline.value.currentIndex]
        if (!rawGrid) {
          throw new Error('当前产品时次缺少格点数据')
        }
        if (file.prodCode.endsWith('-PRO') || file.prodCode.endsWith('-VAL')) {
          console.groupCollapsed(
            `[SCMOC] ${currentFactor.value.name}${currentOption.value} `
              + `${timeline.value.currentLabel.dateTime}`,
          )
          console.log('请求参数:', {
            prodCode: file.prodCode,
            ptime: file.ptime,
            validTime: file.validTime,
            ...extent,
            dataFormat: 'json',
          })
          console.log('接口返回的全部时效格点:', grids)
          console.log('当前时效格点:', rawGrid)
          console.groupEnd()
        }
        mapRenderData.value.gridData = normalizeScmocGridData(rawGrid)
        mapRenderData.value.colorConfig = getScmocColorConfig(file.prodCode)
        mapRenderData.value.convectionProductImage = null
        mapRenderData.value.lastUpdateTime = new Date().toISOString()
      } catch (error: any) {
        if (requestSerial !== mapDataRequestSerial) return
        console.error('Failed to load convection product grid:', error)
        try {
          const imageCacheKey = `${file.prodCode}_${file.ptime}_${file.filePath}`
          const blob = convectionProductImageCache.value[imageCacheKey]
            || await downloadScmocGridFile({ ptime: file.ptime, filePath: file.filePath })
          if (requestSerial !== mapDataRequestSerial) return
          convectionProductImageCache.value[imageCacheKey] = blob
          mapRenderData.value.convectionProductImage = {
            blob,
            filePath: file.filePath,
            ptime: file.ptime,
            validTime: file.validTime,
          }
          mapRenderData.value.error = null
        } catch (imageError: any) {
          if (requestSerial !== mapDataRequestSerial) return
          mapRenderData.value.convectionProductImage = null
          mapRenderData.value.error = imageError.message || '强对流产品数据加载失败'
          console.error('Failed to load convection product image fallback:', imageError)
        }
      } finally {
        if (requestSerial === mapDataRequestSerial) {
          mapRenderData.value.loading = false
        }
      }
      return
    }
    if (isConvectionLightningLive.value) {
      mapRenderData.value.gridData = null
      mapRenderData.value.error = null
      return
    }
    if (isConvectionRiskView.value) {
      mapRenderData.value.gridData = null
      mapRenderData.value.error = null
      return
    }
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
      const data = normalizeMapGridDataForCurrentFactor(dataCache.value[cacheKey])
      dataCache.value[cacheKey] = data
      mapRenderData.value.gridData = data
      mapRenderData.value.lastUpdateTime = new Date().toISOString()
      return
    }

    // 加载数据
    mapRenderData.value.loading = true
    mapRenderData.value.error = null

    try {
      // 根据要素类型和选项获取数据
      const dataUrl = await generateData(currentTimeFile)
      if (
        requestSerial !== mapDataRequestSerial
        || requestProductMode !== productMode.value
        || requestSelection !== currentSelection.value
        || currentTimeFile !== timeline.value.currentLabel.filePath
      ) {
        return
      }
      console.log(dataUrl,'map')
      const data = normalizeMapGridDataForCurrentFactor(dataUrl)
      // 缓存数据
      dataCache.value[cacheKey] = data
      mapRenderData.value.gridData = data
      mapRenderData.value.lastUpdateTime = new Date().toISOString()

      // 更新刷新状态
      refreshState.value.lastRefreshTime = new Date().toISOString()
      refreshState.value.refreshCount++
    } catch (error: any) {
      if (requestSerial !== mapDataRequestSerial) return
      mapRenderData.value.error = error.message || '加载数据失败'
      console.error('Failed to refresh map data:', error)
    } finally {
      if (requestSerial === mapDataRequestSerial) {
        mapRenderData.value.loading = false
      }
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
    // 调试：打印 /api/getDataFile 的完整返回，查看除网格值外还有哪些字段
    console.log(`[getDataFile] ele=${currentGridEle.value} filePath=${filePath}`, res)
    console.log('[getDataFile] 返回顶层字段:', Object.keys(res || {}))
    if (res?.DS && typeof res.DS === 'object') {
      console.log('[getDataFile] DS 字段:', Object.fromEntries(
        Object.entries(res.DS).map(([key, value]) => [
          key,
          Array.isArray(value) ? `Array(${value.length})，前5项: ${JSON.stringify(value.slice(0, 5))}` : value,
        ]),
      ))
    }
    return res.DS
  }

  function normalizeMapGridDataForCurrentFactor(gridData: any) {
    if (currentFactor.value.type !== 'visibility') return gridData
    if (gridData?.__visibilityUnit === 'm') return gridData
    return roundVisibilityGridData(gridData)
  }

  function isMissingGridValue(value: unknown, missingValue: unknown) {
    if (value == null) return true
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return true
    if (missingValue == null) return false

    const numericMissingValue = Number(missingValue)
    return Number.isFinite(numericMissingValue) && numericValue === numericMissingValue
  }

  function roundVisibilityGridValue(value: unknown, missingValue: unknown) {
    if (isMissingGridValue(value, missingValue)) return value
    const meterValue = productMode.value === 'forecast' ? Number(value) * 1000 : Number(value)
    return Math.round(meterValue)
  }

  function roundOptionalVisibilityGridValue(value: unknown, missingValue: unknown) {
    if (value == null || isMissingGridValue(value, missingValue)) return value
    return roundVisibilityGridValue(value, missingValue)
  }

  function roundVisibilityGridData(gridData: any) {
    if (!gridData) return gridData

    const missingValue = gridData.missingValue

    if (gridData.values instanceof Float32Array) {
      const values = new Float32Array(gridData.values.length)
      for (let index = 0; index < gridData.values.length; index++) {
        values[index] = Number(roundVisibilityGridValue(gridData.values[index], missingValue))
      }

      return {
        ...gridData,
        __visibilityUnit: 'm',
        values,
        minValue: roundOptionalVisibilityGridValue(gridData.minValue, missingValue),
        maxValue: roundOptionalVisibilityGridValue(gridData.maxValue, missingValue),
      }
    }

    if (Array.isArray(gridData.v)) {
      return {
        ...gridData,
        __visibilityUnit: 'm',
        v: gridData.v.map((value: unknown) => roundVisibilityGridValue(value, missingValue)),
        minValue: roundOptionalVisibilityGridValue(gridData.minValue, missingValue),
        maxValue: roundOptionalVisibilityGridValue(gridData.maxValue, missingValue),
      }
    }

    return {
      ...gridData,
      __visibilityUnit: 'm',
    }
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

  function setConvectionWarningData(source: ShortTermWarningData | null | undefined) {
    convectionSource.value = source ?? null
    return rebuildConvectionData()
  }

  /** 按当前产品模式（0-2h 实况 / 0-24h 预报）重建强对流帧与时间轴 */
  function rebuildConvectionData() {
    const riskType = CONVECTION_RISK_TYPES[currentOptionIndex.value] ?? 'composite'
    const renderData = buildConvectionRenderData(convectionSource.value, productMode.value, riskType)
    if (!isConvectionRiskView.value) return renderData
    mapRenderData.value.convectionData = renderData
    mapRenderData.value.gridData = null
    mapRenderData.value.colorConfig = null
    mapRenderData.value.error = renderData ? null : '强对流风险暂无数据'
    setTimelineLabels(renderData?.timeline ?? [])
    mapRenderData.value.lastUpdateTime = new Date().toISOString()
    return renderData
  }

  /** 获取当前 SCMOC 产品的最新起报时次及其全部有效时效 */
  async function loadConvectionProductTimeline() {
    const prodCode = currentScmocProdCode.value
    const requestSelection = currentSelection.value
    if (!prodCode) return

    mapRenderData.value.loading = true
    mapRenderData.value.error = null
    mapRenderData.value.gridData = null
    mapRenderData.value.convectionData = null
    mapRenderData.value.convectionProductImage = null

    try {
      const fileListRequestParams = {
        prodCode,
        limitCnt: 50,
        dataType: 'png',
        dataFormat: 'json',
      } as const
      if (prodCode.endsWith('-PRO') || prodCode.endsWith('-VAL')) {
        console.log(
          '[SCMOC] 文件列表接口请求参数 getNafpNwfdScmocOfGridEleTimeListByTimeRange:',
          fileListRequestParams,
        )
      }
      const response = await getScmocGridFileList(fileListRequestParams)
      if (
        requestSelection !== currentSelection.value
        || prodCode !== currentScmocProdCode.value
      ) {
        return
      }

      const files = Array.isArray(response.DS) ? response.DS : []
      const ptimeValues = files
        .map((item) => item.ptime)
        .filter((ptime) => /^\d{14}$/.test(ptime))
        .sort()
      const latestPtime = ptimeValues[ptimeValues.length - 1]
      const latestFiles = files
        .filter((item) => item.ptime === latestPtime && Number(item.validTime) >= 1 && Number(item.validTime) <= 24)
        .sort((a, b) => Number(a.validTime) - Number(b.validTime))

      convectionProductFiles.value = Object.fromEntries(
        latestFiles.map((item) => [item.filePath, item]),
      )
      setTimelineLabels(latestFiles.map((item) => ({
        dateTime: formatScmocValidTime(item.ptime, item.validTime),
        filePath: item.filePath,
      })))

      if (!latestFiles.length) {
        mapRenderData.value.error = '当前强对流产品暂无可用时次'
        return
      }

      await refreshMapData()
    } catch (error: any) {
      if (requestSelection !== currentSelection.value) return
      convectionProductFiles.value = {}
      setTimelineLabels([])
      mapRenderData.value.convectionProductImage = null
      mapRenderData.value.error = error.message || '强对流产品时次加载失败'
      console.error('Failed to load convection product timeline:', error)
    } finally {
      mapRenderData.value.loading = false
    }
  }

  /** 地区选择变化时，使用该地区的外接范围重新请求 SCMOC 原始格点 */
  function setConvectionProductExtent(extent: ScmocGridExtent) {
    const previous = convectionProductExtent.value
    const changed = !previous
      || previous.startLon !== extent.startLon
      || previous.startLat !== extent.startLat
      || previous.endLon !== extent.endLon
      || previous.endLat !== extent.endLat
    if (!changed) return

    convectionProductExtent.value = extent
    if (isConvectionImageProduct.value && timeline.value.currentLabel.filePath) {
      void refreshMapData()
    }
  }

  /**
   * 根据当前要素从接口获取色标，并按当前 ele 匹配 alias。
   * 若没有 alias 匹配项，则使用该 category 返回的第一条色标。
   */
  async function loadCurrentColorConfig() {
    const requestSerial = ++colorConfigRequestSerial
    const requestProductMode = productMode.value
    const requestSelection = currentSelection.value
    if (isConvectionRiskView.value || isConvectionImageProduct.value) {
      setColorConfig(null)
      return null
    }
    const category = currentFactor.value.type
    const ele = currentGridEle.value
    if (!category || !ele) {
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
      if (
        requestSerial !== colorConfigRequestSerial
        || requestProductMode !== productMode.value
        || requestSelection !== currentSelection.value
        || category !== currentFactor.value.type
        || ele !== currentGridEle.value
      ) {
        return null
      }

      const matched = pickSebiaoConfig(list, ele)
      const config = buildMapColorConfig(matched, ele)
      setColorConfig(config)
      return config
    } catch (error) {
      if (requestSerial !== colorConfigRequestSerial) return null
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
    scene,
    factors,
    productMode,
    isForecastMode,
    isConvectionGridForecast,
    isConvectionForecastOption,
    isConvectionRiskFactor,
    isConvectionMode,
    isConvectionRiskView,
    isConvectionLightningLive,
    isConvectionImageProduct,
    isConvectionDeterministicProduct,
    currentFactorType,
    currentSelection,
    currentFactor,
    currentOptionIndex,
    currentOption,
    currentGridEle,
    currentConvectionFrame,
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
    setScene,
    setProductMode,
    setTimelineIndex,
    setTimelineLabels,
    refreshMapData,
    manualRefresh,
    setAutoRefresh,
    setBoundaryData,
    setColorConfig,
    setConvectionWarningData,
    loadConvectionProductTimeline,
    setConvectionProductExtent,
    loadCurrentColorConfig,
    clearCache,
    clearError,
    initTimeline,
    setFactorOption,
  }
})

function formatScmocValidTime(ptime: string, validTime: number) {
  if (!/^\d{14}$/.test(ptime)) return ''
  const start = dayjs(
    `${ptime.slice(0, 4)}-${ptime.slice(4, 6)}-${ptime.slice(6, 8)} `
      + `${ptime.slice(8, 10)}:${ptime.slice(10, 12)}:${ptime.slice(12, 14)}`,
  )
  return start.add(Number(validTime) || 0, 'hour').format('YYYY-MM-DD HH:mm:ss')
}

function normalizeScmocGridData(grid: {
  startLon: number
  startLat: number
  endLon: number
  endLat: number
  lonStep: number
  latStep: number
  lonLength: number
  latLength: number
  values: number[]
}) {
  return {
    nx: grid.lonLength,
    ny: grid.latLength,
    startLon: grid.startLon,
    endLon: grid.endLon,
    startLat: grid.startLat,
    endLat: grid.endLat,
    lonStep: grid.lonStep,
    latStep: grid.latStep,
    // -1 是产品有效编码；9999 是接口返回的无有效数据标记。
    missingValue: 9999,
    v: grid.values,
  }
}

function getScmocColorConfig(prodCode: string): MapColorConfig {
  const source = prodCode.endsWith('-PRO')
    ? SCMOC_PROBABILITY_COLOR_CONFIG
    : prodCode.endsWith('-VAL')
      ? SCMOC_DETERMINISTIC_COLOR_CONFIG
      : SCMOC_LEVEL_COLOR_CONFIG
  return {
    ...source,
    fieldName: prodCode,
    stops: source.stops.map((stop) => ({ ...stop })),
  }
}

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

function buildConvectionRenderData(
  source: ShortTermWarningData | null | undefined,
  mode: ProductMode = 'live',
  riskType: ConvectionRiskType = 'composite',
): ConvectionRenderData | null {
  const sourceRows = Array.isArray(source?.warning) ? source.warning : []
  if (!sourceRows.length) return null

  const rows = sourceRows.map((row) => ({ ...row, hours: getRiskTypeHours(row, riskType) }))
  const endTime = parseConvectionBaseTime(source?.observeTime || source?.time)
  return mode === 'forecast'
    ? buildConvectionForecastFrames(rows, endTime)
    : buildConvectionLiveFrames(rows, endTime)
}

/**
 * 取指定风险类型的逐时风险：优先读接口约定字段 rainHours / windHours，
 * 接口未提供时按乡镇与时次生成稳定的 mock 数据（接口接入后可删除）。
 */
function getRiskTypeHours(row: ShortTermWarningTown, riskType: ConvectionRiskType): ShortTermWarningHour[] {
  const hours = Array.isArray(row.hours) ? row.hours : []
  if (riskType === 'composite') return hours

  const typed = row[`${riskType}Hours`]
  if (Array.isArray(typed) && typed.length) return typed

  const seedKey = String(row.town ?? row.name ?? row.code ?? '')
  return hours.map((hour, index) => {
    const base = normalizeConvectionRisk(hour.risk)
    const seed = hashText(`${riskType}|${seedKey}|${index}`) % 6
    const risk = Math.min(base, seed >= 4 ? 2 : seed >= 2 ? 1 : 0)
    return { ...hour, risk }
  })
}

function hashText(text: string) {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  return hash
}

/** 0-2h 实况：最近 110 分钟按 10 分钟出 12 帧，取各站当前实况风险 */
function buildConvectionLiveFrames(rows: ShortTermWarningTown[], endTime: Dayjs): ConvectionRenderData {
  const startTime = endTime.subtract(110, 'minute')
  const timeline = Array.from({ length: 12 }, (_, index) => {
    const time = startTime.add(index * 10, 'minute')
    return {
      dateTime: time.format('YYYY-MM-DD HH:mm:ss'),
      filePath: `convection_${time.format('YYYYMMDDHHmm00')}`,
    }
  })
  const baseRiskMap = buildConvectionRiskMap(rows)
  const frames = timeline.reduce<Record<string, Record<string, ConvectionRiskLevel>>>((result, item) => {
    result[item.filePath] = { ...baseRiskMap }
    return result
  }, {})

  return {
    observeTime: endTime.format('YYYY-MM-DD HH:mm:ss'),
    timeline,
    frames,
  }
}

/** 0-24h 预报：按接口 hours[] 的时间逐小时出帧 */
function buildConvectionForecastFrames(rows: ShortTermWarningTown[], endTime: Dayjs): ConvectionRenderData | null {
  const frames: Record<string, Record<string, ConvectionRiskLevel>> = {}
  const frameTimeMap = new Map<string, Dayjs>()
  // 只取当前整点之后的未来 24 小时（逐小时），不含“当前实况”那一档
  const futureStart = endTime.startOf('hour')
  const futureEnd = futureStart.add(24, 'hour')

  rows.forEach((row) => {
    const townKeys = getWarningTownKeys(row)
    const hours = Array.isArray(row.hours) ? row.hours : []
    if (!townKeys.length || !hours.length) return

    hours.forEach((hour) => {
      const time = parseConvectionHourTime(hour.time, endTime)
      if (!time || !time.isAfter(futureStart) || time.isAfter(futureEnd)) return

      const filePath = `convection_${time.format('YYYYMMDDHH0000')}`
      const frame = frames[filePath] ?? (frames[filePath] = {})
      const risk = normalizeConvectionRisk(hour.risk)
      townKeys.forEach((key) => {
        frame[key] = risk
      })
      frameTimeMap.set(filePath, time)
    })
  })

  const timeline = Array.from(frameTimeMap.entries())
    .sort((a, b) => a[1].valueOf() - b[1].valueOf())
    .map(([filePath, time]) => ({
      dateTime: time.format('YYYY-MM-DD HH:mm:ss'),
      filePath,
    }))

  if (!timeline.length) return null

  return {
    observeTime: endTime.format('YYYY-MM-DD HH:mm:ss'),
    timeline,
    frames,
  }
}

/** hours[].time 可能是完整时间，也可能只是 "14:00"，后者按实况日期补全 */
function parseConvectionHourTime(value: unknown, endTime: Dayjs): Dayjs | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const full = dayjs(raw)
  if (full.isValid()) return full

  const shortMatch = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (!shortMatch) return null

  let time = endTime
    .hour(Number(shortMatch[1]))
    .minute(Number(shortMatch[2]))
    .second(0)
    .millisecond(0)
  if (time.isBefore(endTime.subtract(12, 'hour'))) time = time.add(1, 'day')
  return time
}

function parseConvectionBaseTime(value?: string) {
  const parsed = dayjs(value)
  const time = parsed.isValid() ? parsed : dayjs()
  const minute = Math.floor(time.minute() / 10) * 10
  return time.minute(minute).second(0).millisecond(0)
}

function buildConvectionRiskMap(rows: ShortTermWarningTown[]) {
  const riskMap: Record<string, ConvectionRiskLevel> = {}

  rows.forEach((row) => {
    const risk = normalizeConvectionRisk(row.hours?.[0]?.risk ?? row.risk ?? row.level)
    getWarningTownKeys(row).forEach((key) => {
      riskMap[key] = risk
    })
  })

  return riskMap
}

function getWarningTownKeys(row: ShortTermWarningTown) {
  return [
    row.town,
    row.name,
    row.townName,
    row.NAME,
    row.TOWN,
    row.adcode,
    row.adminCode,
    row.townCode,
    row.code,
  ]
    .map(normalizeConvectionKey)
    .filter(Boolean)
}

function normalizeConvectionRisk(value: unknown): ConvectionRiskLevel {
  const text = String(value ?? '').trim()
  if (text === '2' || text.includes('高') || text.toLowerCase() === 'red') return 2
  if (text === '1' || text.includes('中') || text.includes('黄') || text.toLowerCase() === 'yellow') return 1
  return 0
}

function normalizeConvectionKey(value: unknown) {
  return String(value ?? '').trim()
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

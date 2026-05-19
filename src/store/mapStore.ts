import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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
  /** 数据文件路径模板，如 '/sample/{factor}_{time}.json' */
  dataUrlTemplate?: string
}

/** 时间轴数据 */
export interface TimelineData {
  /** 时间标签列表 */
  labels: string[]
  /** 当前选中的时间索引 */
  currentIndex: number
  /** 当前选中的时间 */
  currentLabel: string
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
    { type: 'temperature', name: '气温', options: ['整点', '日最高', '日最低'], dataUrlTemplate: '/sample/temp_{option}_{time}.json' },
    { type: 'precipitation', name: '降水', options: ['1h', '3h', '6h', '12h', '24h'], dataUrlTemplate: '/sample/rain_{option}_{time}.json' },
    { type: 'wind', name: '风', options: ['极大风', '平均风', '12h极大风'], dataUrlTemplate: '/sample/wind_{option}_{time}.json' },
    { type: 'visibility', name: '能见度', options: ['整点', '日最小'], dataUrlTemplate: '/sample/vis_{option}_{time}.json' },
    { type: 'humidity', name: '相对湿度', options: ['整点', '平均', '日最小'], dataUrlTemplate: '/sample/rh_{option}_{time}.json' },
    { type: 'cloud', name: '云量', options: ['逐小时'], dataUrlTemplate: '/sample/cloud_{time}.json' },
    { type: 'radiation', name: '辐射', options: ['逐15分钟'], dataUrlTemplate: '/sample/radiation_{time}.json' },
    { type: 'convection', name: '强对流', options: ['综合', '暴雨', '雷电', '大风'], dataUrlTemplate: '/sample/convection_{option}_{time}.json' },
  ])

  /** 当前选中的主要素类型 */
  const currentFactorType = ref<FactorType>('temperature')

  /** 当前选中索引（如 '1-1' 表示第1个要素的第1个选项） */
  const currentSelection = ref('1-1')

  /** 当前选中要素配置 */
  const currentFactor = computed(() => {
    const [factorIndex] = currentSelection.value.split('-').map(Number)
    return factors.value[factorIndex - 1] || factors.value[0]
  })

  /** 当前选中选项索引（数组下标） */
  const currentOptionIndex = computed(() => {
    const [, optionIndex] = currentSelection.value.split('-').map(Number)
    const factor = currentFactor.value
    return Math.min(optionIndex - 1, factor.options.length - 1)
  })

  /** 当前选中的选项文本 */
  const currentOption = computed(() => {
    const factor = currentFactor.value
    return factor.options[currentOptionIndex.value] || factor.options[0]
  })

  // ==================== 时间轴状态 ====================
  /** 时间轴数据 */
  const timeline = ref<TimelineData>({
    labels: [],
    currentIndex: 0,
    currentLabel: '',
  })

  /** 原始时间轴数据（按要素类型缓存） */
  const timelineCache = ref<Record<FactorType, string[]>>({
    temperature: [],
    precipitation: [],
    wind: [],
    visibility: [],
    humidity: [],
    cloud: [],
    radiation: [],
    convection: [],
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

  /**
   * 切换要素类型
   */
  function setFactorType(type: FactorType) {
    if (currentFactorType.value === type) return
    currentFactorType.value = type
    
    // 获取该要素在数组中的索引
    const factorIndex = factors.value.findIndex(f => f.type === type)
    // 更新选中索引，选项重置为1
    currentSelection.value = `${factorIndex + 1}-1`
    
    // 更新主时间轴（使用缓存的数据）
    const factorLabels = timelineCache.value[type]
    if (factorLabels.length > 0) {
      timeline.value.labels = factorLabels
      timeline.value.currentIndex = 0
      timeline.value.currentLabel = factorLabels[0]
    }
    
    // 触发数据刷新
    refreshMapData()
  }

  /**
   * 设置当前选中要素的选项
   * @param optionIndex 选项索引（从1开始）
   */
  function setFactorOption(optionIndex: number) {
    const [factorIndex] = currentSelection.value.split('-').map(Number)
    if (optionIndex >= 1) {
      currentSelection.value = `${factorIndex}-${optionIndex}`
      // 切换选项后刷新数据
      refreshMapData()
    }
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
  function setTimelineLabels(labels: string[]) {
    timeline.value.labels = labels
    timeline.value.currentIndex = 0
    timeline.value.currentLabel = labels[0] || ''
    
    // 缓存当前要素的时间轴数据
    if (currentFactorType.value) {
      timelineCache.value[currentFactorType.value] = [...labels]
    }
  }

  /**
   * 手动刷新地图数据
   */
  async function refreshMapData() {
    const factor = currentFactor.value
    const currentTime = timeline.value.currentLabel

    // 构建缓存key
    const cacheKey = `${factor.type}_${currentOption.value}_${currentTime}`

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
      const dataUrl = generateDataUrl(factor.type, currentTime)
      
      if (dataUrl) {
        const response = await fetch(dataUrl)
        if (!response.ok) throw new Error(`Failed to load data: ${response.status}`)
        const data = await response.json()
        
        // 缓存数据
        dataCache.value[cacheKey] = data
        mapRenderData.value.gridData = data
        mapRenderData.value.lastUpdateTime = new Date().toISOString()
        
        // 更新刷新状态
        refreshState.value.lastRefreshTime = new Date().toISOString()
        refreshState.value.refreshCount++
      }
    } catch (error: any) {
      mapRenderData.value.error = error.message || '加载数据失败'
      console.error('Failed to refresh map data:', error)
    } finally {
      mapRenderData.value.loading = false
    }
  }

  /**
   * 生成数据URL
   */
  function generateDataUrl(type: FactorType, time: string): string {
    const factor = factors.value.find(f => f.type === type)
    if (!factor?.dataUrlTemplate) return ''
    
    // 简化处理：将选项和时间的特殊字符转为适合URL的格式
    const optionKey = currentOption.value.replace(/[^a-zA-Z0-9]/g, '_')
    const timeKey = time.replace(/[^a-zA-Z0-9]/g, '_')
    
    return factor.dataUrlTemplate
      .replace('{option}', optionKey)
      .replace('{time}', timeKey)
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
      ;(refreshState as any)._autoRefreshTimer = null
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
  function initTimeline(initialLabels: string[]) {
    setTimelineLabels(initialLabels)
    // 缓存初始时间轴
    if (currentFactorType.value) {
      timelineCache.value[currentFactorType.value] = [...initialLabels]
    }
  }

  return {
    // 状态
    factors,
    currentFactorType,
    currentSelection,
    currentFactor,
    currentOptionIndex,
    currentOption,
    timeline,
    timelineCache,
    mapRenderData,
    refreshState,
    dataCache,

    // Actions
    setFactorType,
    setFactorOption,
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
  }
})

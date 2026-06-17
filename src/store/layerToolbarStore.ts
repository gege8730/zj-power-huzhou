import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import Feature from 'ol/Feature.js'
import LineString from 'ol/geom/LineString.js'
import Point from 'ol/geom/Point.js'
import ImageLayer from 'ol/layer/Image.js'
import VectorLayer from 'ol/layer/Vector.js'
import ImageStatic from 'ol/source/ImageStatic.js'
import VectorSource from 'ol/source/Vector.js'
import OlMap from 'ol/Map.js'
import { fromLonLat, transformExtent } from 'ol/proj.js'
import Style from 'ol/style/Style.js'
import Stroke from 'ol/style/Stroke.js'
import Icon from 'ol/style/Icon.js'
import { ElMessage } from 'element-plus'
import { unByKey } from 'ol/Observable.js'
import { getElectricLine, radarList } from '@/api/weather'
import towerIconUrl from '@/assets/gt2.png'

/** 图层工具栏类型 */
export type LayerToolbarKey = 'radar' | 'lightning' | 'typhoon' | 'line'

/** 输电线路二级菜单类型 */
export type ElectricLineCategoryKey = 'ac500' | 'dc500' | '800' | '1000'

/** 雷达接口返回单条数据 */
export interface RadarImageItem {
  FileTime: string
  Url: string
  FileFormat: string
  FileName: string
}

/** 输电线路接口返回单个点 */
export interface ElectricLinePoint {
  number?: string | number
  longtitude?: string | number
  longitude?: string | number
  latitude?: string | number
  level?: string | number
  [key: string]: any
}

/** 输电线路接口返回单条线路 */
export interface ElectricLineItem {
  type: string
  time?: string
  data: ElectricLinePoint[]
}

export interface ElectricLineCategoryOption {
  key: ElectricLineCategoryKey
  label: string
}

interface OpenLayersMapLike {
  addLayer?: (layer: any) => unknown
  removeLayer?: (layer: any) => unknown
  getLayers?: () => { getArray: () => any[] }
  getRawMap?: () => OlMap
  getOpenLayersMap?: () => OlMap
  map?: OpenLayersMapLike
  _map?: OpenLayersMapLike
}

const TOOL_NAME_MAP: Record<string, LayerToolbarKey> = {
  '雷达': 'radar',
  '地闪': 'lightning',
  '台风路径': 'typhoon',
  '输电线路': 'line',
}

/** 雷达图片经纬度范围：[west, south, east, north] */
const RADAR_IMAGE_EXTENT_4326: [number, number, number, number] = [115.8459, 26.3196, 124.829, 34.07389]

/** 输电线路二级菜单配置：按线路 type 字段归类 */
export const ELECTRIC_LINE_CATEGORY_OPTIONS: ElectricLineCategoryOption[] = [
  { key: 'ac500', label: '±500kV（交流电）' },
  { key: 'dc500', label: 'V500kV' },
  { key: '800', label: '800kV' },
  { key: '1000', label: '1000kV' },
]

const ELECTRIC_LINE_NORMAL_COLOR = 'rgb(60, 255, 250)'
const ELECTRIC_LINE_ICE_COLOR = 'rgb(255, 0, 0)'
const ELECTRIC_LINE_TOWER_ZOOM = 10.5

const ELECTRIC_LINE_NORMAL_STYLE = new Style({
  stroke: new Stroke({
    color: ELECTRIC_LINE_NORMAL_COLOR,
    width: 4,
    lineCap: 'round',
    lineJoin: 'round',
  }),
})
const ELECTRIC_LINE_ICE_STYLE = new Style({
  stroke: new Stroke({
    color: ELECTRIC_LINE_ICE_COLOR,
    width: 4.4,
    lineCap: 'round',
    lineJoin: 'round',
  }),
})

const ELECTRIC_LINE_TOWER_STYLE = new Style({
  image: new Icon({
    src: towerIconUrl,
    anchor: [0.5, 1],
    scale: 0.34,
  }),
})

export const useLayerToolbarStore = defineStore('layerToolbar', () => {
  /** 当前激活图层集合：雷达、地闪、输电线路允许同时叠加 */
  const activeKeys = ref<LayerToolbarKey[]>([])

  /** 兼容旧模板/调用方读取，实际判断请使用 isToolbarActive */
  const activeKey = computed<LayerToolbarKey | ''>(() => activeKeys.value[activeKeys.value.length - 1] || '')

  /** 当前地图实例，兼容 ZJQXOpenLayersMap 或原生 ol/Map */
  const mapInstance = shallowRef<OpenLayersMapLike | null>(null)

  /** 雷达时次列表 */
  const radarImages = ref<RadarImageItem[]>([])

  /** 当前雷达时次索引 */
  const radarIndex = ref(0)

  /** 雷达图层加载状态 */
  const radarLoading = ref(false)

  /** 输电线路数据 */
  const electricLineData = ref<ElectricLineItem[]>([])

  /** 输电线路选中类型，多选 */
  const electricLineSelectedCategories = ref<ElectricLineCategoryKey[]>([])

  /** 是否显示杆塔点位 */
  const electricLineTowerChecked = ref(false)

  /** 输电线路加载状态 */
  const electricLineLoading = ref(false)

  /** 雷达图层缓存，切换时次只替换当前图片图层 */
  let radarLayer: ImageLayer<ImageStatic> | null = null

  /** 输电线路图层缓存 */
  let electricLineLayer: VectorLayer<VectorSource<Feature>> | null = null

  /** 输电线路渲染令牌，避免快速切换时旧请求覆盖新状态 */
  let electricLineRenderToken = 0

  /** 地图缩放监听，用于自动勾选/取消杆塔 */
  let electricLineZoomListenerKey: any = null

  const isRadarActive = computed(() => isToolbarActive('radar'))
  const isLightningActive = computed(() => isToolbarActive('lightning'))
  const isElectricLineActive = computed(() => isToolbarActive('line'))
  const electricLineCategoryOptions = ELECTRIC_LINE_CATEGORY_OPTIONS
  const electricLineLegendVisible = computed(() => isElectricLineActive.value && electricLineSelectedCategories.value.length > 0)
  const currentRadar = computed(() => radarImages.value[radarIndex.value] || null)
  const currentRadarUrl = computed(() => {
    const radar = currentRadar.value
    return radar ? `${radar.Url}${radar.FileName}` : ''
  })
  const currentRadarLabel = computed(() => formatRadarTime(currentRadar.value?.FileTime))
  const currentElectricLineLabel = computed(() => formatElectricLineTime(electricLineData.value[0]?.time))

  function resolveToolbarKey(name: string): LayerToolbarKey | '' {
    const normalName = String(name || '').replace(/\s/g, '')
    return TOOL_NAME_MAP[normalName] || ''
  }

  function isToolbarActive(key: LayerToolbarKey | '') {
    return !!key && activeKeys.value.includes(key)
  }

  function activateToolbarKey(key: LayerToolbarKey) {
    if (!activeKeys.value.includes(key)) {
      activeKeys.value = [...activeKeys.value, key]
    }
  }

  function deactivateToolbarKey(key: LayerToolbarKey) {
    activeKeys.value = activeKeys.value.filter((item) => item !== key)
  }

  function closeToolbarLayer(key: LayerToolbarKey) {
    if (key === 'radar') {
      removeRadarLayer()
      radarLoading.value = false
    } else if (key === 'line') {
      removeElectricLineLayer()
      resetElectricLineSelection()
      electricLineLoading.value = false
    }
    deactivateToolbarKey(key)
  }

  function setMap(map: OpenLayersMapLike | null) {
    if (!map) {
      removeRadarLayer()
      removeElectricLineLayer()
      unbindElectricLineZoomListener()
    }
    mapInstance.value = map
    if (map) bindElectricLineZoomListener()
    if (map && isRadarActive.value && currentRadarUrl.value) renderRadarLayer()
    if (map && isElectricLineActive.value && electricLineSelectedCategories.value.length) {
      void renderElectricLineLayer()
    }
  }

  function getOpenLayersMap(): OlMap | null {
    const map = mapInstance.value
    if (!map) return null
    if (map instanceof OlMap) return map
    if (typeof map.addLayer === 'function' && typeof map.removeLayer === 'function' && typeof map.getLayers === 'function') return map as OlMap
    const rawMap = map.getRawMap?.()
    if (rawMap) return rawMap
    const olMap = map.getOpenLayersMap?.()
    if (olMap) return olMap
    if (map.map) {
      mapInstance.value = map.map
      return getOpenLayersMap()
    }
    if (map._map) {
      mapInstance.value = map._map
      return getOpenLayersMap()
    }
    return null
  }

  async function handleToolbarClick(name: string) {
    const key = resolveToolbarKey(name)
    if (!key) return

    if (key === 'typhoon') {
      window.open('https://smart.zj121.com/typhoonweb/', '_blank', 'noopener,noreferrer')
      return
    }

    if (key === 'lightning') {
      // 地闪功能暂未实现，先保持不可选，避免出现空状态。
      return
    }

    if (isToolbarActive(key)) {
      closeToolbarLayer(key)
      return
    }

    activateToolbarKey(key)

    if (key === 'radar') {
      await loadRadarImages()
      return
    }

    if (key === 'line') {
      if (!electricLineSelectedCategories.value.length) {
        electricLineSelectedCategories.value = electricLineCategoryOptions.map((item) => item.key)
      }
      syncElectricLineTowerByZoom(false)
      await renderElectricLineLayer()
      return
    }


  }

  async function loadRadarImages() {
    radarLoading.value = true
    radarImages.value = []
    radarIndex.value = 0
    try {
      const endtime = dayjs().format('YYYYMMDDHHmmss')
      const begintime = dayjs().subtract(1, 'day').format('YYYYMMDDHHmmss')
      const res = await radarList({ begintime, endtime })
      const list = Array.isArray(res.DS) ? res.DS : []

      radarImages.value = list
        .filter((item: RadarImageItem) => item?.Url && item?.FileName)
        .sort((a: RadarImageItem, b: RadarImageItem) => String(a.FileTime).localeCompare(String(b.FileTime)))

      radarIndex.value = radarImages.value.length > 0 ? radarImages.value.length - 1 : 0

      if (!radarImages.value.length) {
        deactivateToolbarKey('radar')
        removeRadarLayer()
        ElMessage.warning('暂无雷达图片数据')
        return
      }

      renderRadarLayer()
    } catch (error) {
      console.error('雷达数据加载失败:', error)
      deactivateToolbarKey('radar')
      radarImages.value = []
      removeRadarLayer()
      ElMessage.error('雷达数据加载失败')
    } finally {
      radarLoading.value = false
    }
  }

  function renderRadarLayer() {
    if (!isRadarActive.value || !currentRadarUrl.value) return

    const map = getOpenLayersMap()
    if (!map) {
      ElMessage.warning('地图尚未初始化，无法加载雷达图层')
      return
    }

    removeRadarLayer()
    radarLayer = new ImageLayer({
      source: new ImageStatic({
        url: currentRadarUrl.value,
        imageExtent: transformExtent(RADAR_IMAGE_EXTENT_4326, 'EPSG:4326', map.getView().getProjection()),
        crossOrigin: 'anonymous',
      }),
      opacity: 0.86,
      zIndex: 430,
    })
    map.addLayer(radarLayer)
  }

  function removeRadarLayer() {
    const map = getOpenLayersMap()
    if (radarLayer && map) {
      map.removeLayer(radarLayer)
    }
    radarLayer = null
  }

  function setRadarIndex(index: number) {
    if (index < 0 || index >= radarImages.value.length) return
    radarIndex.value = index
    renderRadarLayer()
  }

  function prevRadar() {
    if (radarIndex.value <= 0) return
    setRadarIndex(radarIndex.value - 1)
  }

  function nextRadar() {
    if (radarIndex.value >= radarImages.value.length - 1) return
    setRadarIndex(radarIndex.value + 1)
  }

  async function toggleElectricLineCategory(key: ElectricLineCategoryKey) {
    const exists = electricLineSelectedCategories.value.includes(key)
    electricLineSelectedCategories.value = exists
      ? electricLineSelectedCategories.value.filter((item: ElectricLineCategoryKey) => item !== key)
      : [...electricLineSelectedCategories.value, key]

    if (!electricLineSelectedCategories.value.length) {
      removeElectricLineLayer()
      electricLineTowerChecked.value = false
      deactivateToolbarKey('line')
      return
    }

    if (!isElectricLineActive.value) {
      activateToolbarKey('line')
    }

    await renderElectricLineLayer()
  }

  function isElectricLineCategoryChecked(key: ElectricLineCategoryKey) {
    return electricLineSelectedCategories.value.includes(key)
  }

  async function toggleElectricLineTower() {
    if (!isElectricLineActive.value) {
      activateToolbarKey('line')
    }

    if (!electricLineSelectedCategories.value.length) {
      electricLineSelectedCategories.value = electricLineCategoryOptions.map((item) => item.key)
    }

    electricLineTowerChecked.value = !electricLineTowerChecked.value
    await renderElectricLineLayer()
  }

  function syncElectricLineTowerByZoom(shouldRender = true) {
    const map = getOpenLayersMap()
    if (!map || !isElectricLineActive.value) return

    const zoom = map.getView().getZoom()
    if (typeof zoom !== 'number') return

    const shouldChecked = zoom > ELECTRIC_LINE_TOWER_ZOOM
    if (electricLineTowerChecked.value === shouldChecked) return

    electricLineTowerChecked.value = shouldChecked
    if (shouldRender && electricLineSelectedCategories.value.length) {
      void renderElectricLineLayer()
    }
  }

  function bindElectricLineZoomListener() {
    const map = getOpenLayersMap()
    if (!map) return

    unbindElectricLineZoomListener()
    electricLineZoomListenerKey = map.getView().on('change:resolution', () => {
      syncElectricLineTowerByZoom(true)
    })
  }

  function unbindElectricLineZoomListener() {
    if (electricLineZoomListenerKey) {
      unByKey(electricLineZoomListenerKey)
      electricLineZoomListenerKey = null
    }
  }

  function resetElectricLineSelection() {
    electricLineSelectedCategories.value = []
    electricLineTowerChecked.value = false
  }

  async function loadElectricLineData() {
    if (electricLineData.value.length) return electricLineData.value

    electricLineLoading.value = true
    try {
      const response = await getElectricLine()
      const list = normalizeElectricLineResponse(response)
      electricLineData.value = list
      return list
    } catch (error) {
      console.error('输电线路接口加载失败:', error)
      electricLineData.value = []
      ElMessage.error('输电线路数据加载失败')
      return []
    } finally {
      electricLineLoading.value = false
    }
  }

  async function renderElectricLineLayer() {
    const token = ++electricLineRenderToken
    if (!isElectricLineActive.value || !electricLineSelectedCategories.value.length) {
      removeElectricLineLayer()
      return
    }

    const map = getOpenLayersMap()
    if (!map) {
      ElMessage.warning('地图尚未初始化，无法加载输电线路')
      return
    }

    const list = await loadElectricLineData()
    if (token !== electricLineRenderToken || !isElectricLineActive.value) return

    const features = createElectricLineFeatures(list, electricLineSelectedCategories.value, electricLineTowerChecked.value, map)
    removeElectricLineLayer()

    if (!features.length) {
      ElMessage.warning('当前所选输电线路暂无数据')
      return
    }

    electricLineLayer = new VectorLayer({
      source: new VectorSource({ features }),
      style: electricLineStyle,
      zIndex: 540,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      declutter: false,
    }) as VectorLayer<VectorSource<Feature>>
    map.addLayer(electricLineLayer)
  }

  function removeElectricLineLayer() {
    electricLineRenderToken++
    const map = getOpenLayersMap()
    if (electricLineLayer && map && map.getLayers().getArray().includes(electricLineLayer)) {
      map.removeLayer(electricLineLayer)
    }
    electricLineLayer = null
  }

  function clearActiveLayer() {
    removeRadarLayer()
    removeElectricLineLayer()
    activeKeys.value = []
    resetElectricLineSelection()
    radarLoading.value = false
    electricLineLoading.value = false
  }

  return {
    activeKeys,
    activeKey,
    radarImages,
    radarIndex,
    radarLoading,
    electricLineData,
    electricLineSelectedCategories,
    electricLineTowerChecked,
    electricLineLoading,
    electricLineCategoryOptions,
    electricLineLegendVisible,
    isRadarActive,
    isLightningActive,
    isElectricLineActive,
    currentRadar,
    currentRadarUrl,
    currentRadarLabel,
    currentElectricLineLabel,
    resolveToolbarKey,
    isToolbarActive,
    setMap,
    handleToolbarClick,
    loadRadarImages,
    renderRadarLayer,
    removeRadarLayer,
    setRadarIndex,
    prevRadar,
    nextRadar,
    toggleElectricLineCategory,
    isElectricLineCategoryChecked,
    toggleElectricLineTower,
    syncElectricLineTowerByZoom,
    loadElectricLineData,
    renderElectricLineLayer,
    removeElectricLineLayer,
    clearActiveLayer,
  }
})

function formatRadarTime(value?: string) {
  const time = parseCompactDateTime(value)
  if (!time) return ''
  return `${time.month}月${time.day}日 ${time.hour}时${time.minute}分 雷达分布图`
}

function formatElectricLineTime(value?: string) {
  const time = parseCompactDateTime(value)
  if (!time) return ''
  return `${time.month}月${time.day}日 ${time.hour}时${time.minute}分 覆冰分布图`
}

function parseCompactDateTime(value?: string) {
  const raw = String(value || '').trim()
  if (!raw) return null

  const zoneMatch = raw.match(/(Z|[+-]\d{2}:?\d{2})$/i)
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 12) return null

  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  const day = Number(digits.slice(6, 8))
  const hour = Number(digits.slice(8, 10))
  const minute = Number(digits.slice(10, 12))
  const second = digits.length >= 14 ? Number(digits.slice(12, 14)) : 0

  if ([year, month, day, hour, minute, second].some((item) => Number.isNaN(item))) return null

  if (zoneMatch) {
    const zone = zoneMatch[1].toUpperCase()
    const offsetMinute = zone === 'Z' ? 0 : parseTimezoneOffset(zone)
    const utcTime = Date.UTC(year, month - 1, day, hour, minute, second) - offsetMinute * 60 * 1000
    const beijingTime = new Date(utcTime + 8 * 60 * 60 * 1000)
    return {
      month: pad2(beijingTime.getUTCMonth() + 1),
      day: pad2(beijingTime.getUTCDate()),
      hour: pad2(beijingTime.getUTCHours()),
      minute: pad2(beijingTime.getUTCMinutes()),
    }
  }

  return {
    month: pad2(month),
    day: pad2(day),
    hour: pad2(hour),
    minute: pad2(minute),
  }
}

function parseTimezoneOffset(zone: string) {
  const sign = zone.startsWith('-') ? -1 : 1
  const clean = zone.replace(':', '')
  const hour = Number(clean.slice(1, 3))
  const minute = Number(clean.slice(3, 5))
  return sign * (hour * 60 + minute)
}

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function normalizeElectricLineResponse(payload: any): ElectricLineItem[] {
  const list = Array.isArray(payload) ? payload : Array.isArray(payload?.DS) ? payload.DS : []
  return list
    .filter((item: any) => item && Array.isArray(item.data) && item.data.length >= 2)
    .map((item: any) => ({
      type: String(item.type || ''),
      time: item.time ? String(item.time) : '',
      data: item.data,
    }))
}

function createElectricLineFeatures(
  list: ElectricLineItem[],
  selectedCategories: ElectricLineCategoryKey[],
  showTowers: boolean,
  map: OlMap,
) {
  const selectedSet = new Set(selectedCategories)
  const projection = map.getView().getProjection()
  const features: Feature[] = []

  list.forEach((line) => {
    const category = resolveElectricLineCategory(line.type)
    if (!category || !selectedSet.has(category)) return

    const points = line.data
      .map((point) => ({
        source: point,
        lng: Number(point.longitude ?? point.longtitude),
        lat: Number(point.latitude),
      }))
      .filter((point) => Number.isFinite(point.lng) && Number.isFinite(point.lat))

    for (let index = 1; index < points.length; index++) {
      const prev = points[index - 1]
      const next = points[index]
      const feature = new Feature({
        geometry: new LineString([
          fromLonLat([prev.lng, prev.lat], projection),
          fromLonLat([next.lng, next.lat], projection),
        ]),
        lineType: line.type,
        category,
        level: isElectricLineSegmentIcing(prev.source, next.source) ? 1 : 0,
        startNumber: prev.source.number,
        endNumber: next.source.number,
      })
      features.push(feature)
    }

    if (showTowers) {
      points.forEach((point) => {
        const feature = new Feature({
          geometry: new Point(fromLonLat([point.lng, point.lat], projection)),
          featureType: 'tower',
          lineType: line.type,
          category,
          level: isIcingLevel(point.source.level) ? 1 : 0,
          number: point.source.number,
        })
        features.push(feature)
      })
    }
  })

  return features
}

function electricLineStyle(feature: any) {
  if (feature.get('featureType') === 'tower') return ELECTRIC_LINE_TOWER_STYLE
  return Number(feature.get('level')) !== 0 ? ELECTRIC_LINE_ICE_STYLE : ELECTRIC_LINE_NORMAL_STYLE
}

function isElectricLineSegmentIcing(start: ElectricLinePoint, end: ElectricLinePoint) {
  return isIcingLevel(start.level) || isIcingLevel(end.level)
}

function isIcingLevel(level: unknown) {
  const numericLevel = Number(level)
  return Number.isFinite(numericLevel) && numericLevel !== 0
}

function resolveElectricLineCategory(type: string): ElectricLineCategoryKey | null {
  const normalizedType = String(type || '').toLowerCase()
  if (normalizedType.includes('1000')) return '1000'
  if (normalizedType.includes('800')) return '800'
  if (normalizedType.includes('500') && normalizedType.includes('直流')) return 'dc500'
  if (normalizedType.includes('500') && normalizedType.includes('交流')) return 'ac500'
  return null
}

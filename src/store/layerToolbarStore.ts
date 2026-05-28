import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import ImageLayer from 'ol/layer/Image.js'
import ImageStatic from 'ol/source/ImageStatic.js'
import OlMap from 'ol/Map.js'
import { transformExtent } from 'ol/proj.js'
import { ElMessage } from 'element-plus'
import { radarList } from '@/api/weather'

/** 图层工具栏类型 */
export type LayerToolbarKey = 'radar' | 'lightning' | 'typhoon' | 'line'

/** 雷达接口返回单条数据 */
export interface RadarImageItem {
  FileTime: string
  Url: string
  FileFormat: string
  FileName: string
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

export const useLayerToolbarStore = defineStore('layerToolbar', () => {
  /** 当前激活图层，默认不选中 */
  const activeKey = ref<LayerToolbarKey | ''>('')

  /** 当前地图实例，兼容 ZJQXOpenLayersMap 或原生 ol/Map */
  const mapInstance = shallowRef<OpenLayersMapLike | null>(null)

  /** 雷达时次列表 */
  const radarImages = ref<RadarImageItem[]>([])

  /** 当前雷达时次索引 */
  const radarIndex = ref(0)

  /** 雷达图层加载状态 */
  const radarLoading = ref(false)

  /** 雷达图层缓存，切换时次只替换当前图片图层 */
  let radarLayer: ImageLayer<ImageStatic> | null = null

  const isRadarActive = computed(() => activeKey.value === 'radar')
  const currentRadar = computed(() => radarImages.value[radarIndex.value] || null)
  const currentRadarUrl = computed(() => {
    const radar = currentRadar.value
    return radar ? `${radar.Url}${radar.FileName}` : ''
  })
  const currentRadarLabel = computed(() => formatRadarTime(currentRadar.value?.FileTime))

  function resolveToolbarKey(name: string): LayerToolbarKey | '' {
    const normalName = String(name || '').replace(/\s/g, '')
    return TOOL_NAME_MAP[normalName] || ''
  }

  function setMap(map: OpenLayersMapLike | null) {
    if (!map) removeRadarLayer()
    mapInstance.value = map
    if (map && isRadarActive.value && currentRadarUrl.value) renderRadarLayer()
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

    if (activeKey.value === key) {
      clearActiveLayer()
      return
    }

    clearActiveLayer()
    activeKey.value = key

    if (key === 'radar') {
      await loadRadarImages()
      return
    }

    if (key === 'typhoon') {
      window.open('https://smart.zj121.com/typhoonweb/', '_blank', 'noopener,noreferrer')
      return
    }

    ElMessage.warning('该要素正在开发中')
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
        ElMessage.warning('暂无雷达图片数据')
        return
      }

      renderRadarLayer()
    } catch (error) {
      console.error('雷达数据加载失败:', error)
      activeKey.value = ''
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

  function clearActiveLayer() {
    if (activeKey.value === 'radar') removeRadarLayer()
    activeKey.value = ''
    radarLoading.value = false
  }

  return {
    activeKey,
    radarImages,
    radarIndex,
    radarLoading,
    isRadarActive,
    currentRadar,
    currentRadarUrl,
    currentRadarLabel,
    resolveToolbarKey,
    setMap,
    handleToolbarClick,
    loadRadarImages,
    renderRadarLayer,
    removeRadarLayer,
    setRadarIndex,
    prevRadar,
    nextRadar,
    clearActiveLayer,
  }
})

function formatRadarTime(value?: string) {
  if (!value) return ''
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('MM-DD HH:mm') : value
}

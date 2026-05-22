import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import L, { type ImageOverlay, type LatLngBoundsExpression } from 'leaflet'
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

interface LeafletLikeMap {
  addLayer?: (layer: any) => unknown
  removeLayer?: (layer: any) => unknown
  map?: LeafletLikeMap
  _map?: LeafletLikeMap
  leafletMap?: LeafletLikeMap
  getMap?: () => LeafletLikeMap
  getLeafletMap?: () => LeafletLikeMap
}

const TOOL_NAME_MAP: Record<string, LayerToolbarKey> = {
  '雷达': 'radar',
  '地闪': 'lightning',
  '台风路径': 'typhoon',
  '输电线路': 'line',
}

const RADAR_IMAGE_BOUNDS: LatLngBoundsExpression = [
  [26.3196, 115.8459],
  [34.07389, 124.829],
]

export const useLayerToolbarStore = defineStore('layerToolbar', () => {
  /** 当前激活图层，默认不选中 */
  const activeKey = ref<LayerToolbarKey | ''>('')

  /** 当前地图实例，兼容 Leaflet addLayer/removeLayer 即可 */
  const mapInstance = shallowRef<LeafletLikeMap | null>(null)

  /** 雷达时次列表 */
  const radarImages = ref<RadarImageItem[]>([])

  /** 当前雷达时次索引 */
  const radarIndex = ref(0)

  /** 雷达图层加载状态 */
  const radarLoading = ref(false)

  /** 雷达图层缓存，切换时次只替换当前图片图层 */
  let radarLayer: ImageOverlay | null = null

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

  function setMap(map: LeafletLikeMap | null) {
    if (!map) removeRadarLayer()
    mapInstance.value = map
    if (map && isRadarActive.value && currentRadarUrl.value) renderRadarLayer()
  }

  function getLeafletMap() {
    const map = mapInstance.value
    if (!map) return null
    if (typeof map.addLayer === 'function' && typeof map.removeLayer === 'function') return map
    if (map.map && typeof map.map.addLayer === 'function') return map.map
    if (map._map && typeof map._map.addLayer === 'function') return map._map
    if (map.leafletMap && typeof map.leafletMap.addLayer === 'function') return map.leafletMap
    const maybeMap = map.getMap?.()
    if (maybeMap && typeof maybeMap.addLayer === 'function') return maybeMap
    const maybeLeafletMap = map.getLeafletMap?.()
    if (maybeLeafletMap && typeof maybeLeafletMap.addLayer === 'function') return maybeLeafletMap
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

    const map = getLeafletMap()
    if (!map) {
      ElMessage.warning('地图尚未初始化，无法加载雷达图层')
      return
    }

    removeRadarLayer()
    radarLayer = L.imageOverlay(currentRadarUrl.value, RADAR_IMAGE_BOUNDS, {
      opacity: 0.86,
      interactive: false,
      zIndex: 430,
    })
    radarLayer.addTo(map as L.Map)
  }

  function removeRadarLayer() {
    const map = getLeafletMap()
    if (radarLayer && map) {
      map.removeLayer?.(radarLayer)
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

function formatRadarTime(fileTime?: string) {
  if (!fileTime) return ''
  const time = String(fileTime).replace(/\D/g, '')
  if (time.length < 12) return fileTime
  return `${time.slice(6, 8)}日${time.slice(8, 10)}时${time.slice(10, 12)}分雷达`
}

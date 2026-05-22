import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { getWarn } from '@/api/weather'

export type WarningSeverity = 'Red' | 'Orange' | 'Yellow' | 'Blue' | string

export interface WarningInfo {
  severity?: WarningSeverity
  description?: string
  headline?: string
  instruction?: string
  defences?: string
  effective?: string
  expires?: string
  disaName?: string
  area?: {
    areaDesc?: string
    geocode?: string
    polygon?: string
    circle?: string
  }
  [key: string]: any
}

export interface WarningItem {
  identifier?: string
  icon_url?: string
  icon_url2?: string
  display_type_name?: string
  sendTime?: string
  sender?: string
  msgType?: string
  info?: WarningInfo
  code?: {
    method?: Array<{ message?: string; [key: string]: any }>
  }
  [key: string]: any
}

const SEVERITY_WEIGHT: Record<string, number> = {
  Red: 0,
  Orange: 1,
  Yellow: 2,
  Blue: 3,
}

export const useWarningStore = defineStore('warning', () => {
  /** 当前气象预警 */
  const warnings = ref<WarningItem[]>([])

  /** 当前选择预警 */
  const currentWarning = ref<WarningItem | null>(null)

  /** 预警弹窗 */
  const dialogVisible = ref(false)

  /** 加载状态 */
  const loading = ref(false)

  /** 排序后的预警：红、橙、黄、蓝，同级保持默认顺序 */
  const sortedWarnings = computed(() => warnings.value
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aWeight = getSeverityWeight(a.item)
      const bWeight = getSeverityWeight(b.item)
      if (aWeight !== bWeight) return aWeight - bWeight
      return a.index - b.index
    })
    .map(({ item }) => item))

  /** 两个一组，超过两个给横向轮播使用 */
  const warningPages = computed(() => {
    const pages: WarningItem[][] = []
    for (let i = 0; i < sortedWarnings.value.length; i += 2) {
      pages.push(sortedWarnings.value.slice(i, i + 2))
    }
    return pages
  })

  async function loadWarnings(area = '湖州') {
    loading.value = true
    try {
      const res = await getWarn({ area })
      warnings.value = normalizeWarningList((res as any)?.DS ?? res)
    } catch (error) {
      console.warn('预警接口请求失败，尝试使用本地样例数据:', error)
      try {
        const localRes = await fetch('/sample/alert.json')
        warnings.value = normalizeWarningList(await localRes.json())
      } catch (localError) {
        console.error('预警样例数据加载失败:', localError)
        warnings.value = []
        ElMessage.error('气象预警加载失败')
      }
    } finally {
      loading.value = false
    }
  }

  function openWarning(item: WarningItem) {
    currentWarning.value = item
    dialogVisible.value = true
  }

  function closeWarning() {
    dialogVisible.value = false
  }

  return {
    warnings,
    sortedWarnings,
    warningPages,
    currentWarning,
    dialogVisible,
    loading,
    loadWarnings,
    openWarning,
    closeWarning,
  }
})

function normalizeWarningList(data: any): WarningItem[] {
  const list = Array.isArray(data) ? data : []
  return list
    .map((item) => item?.alert || item)
    .filter((item) => item && (item.icon_url || item.icon_url2 || item.info || item.display_type_name))
}

function getSeverityWeight(item: WarningItem) {
  const severity = item.info?.severity || ''
  return SEVERITY_WEIGHT[severity] ?? 99
}

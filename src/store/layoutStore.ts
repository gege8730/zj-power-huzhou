import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 页面布局交互状态 */
export const useLayoutStore = defineStore('layout', () => {
  /** 地图全屏态：收起左右两侧面板，中心地图区域横向铺开 */
  const isMapFullscreen = ref(false)

  const toggleMapFullscreen = () => {
    isMapFullscreen.value = !isMapFullscreen.value
  }

  const setMapFullscreen = (value: boolean) => {
    isMapFullscreen.value = value
  }

  return {
    isMapFullscreen,
    toggleMapFullscreen,
    setMapFullscreen,
  }
})

<template>
  <div class="pivot-root">
    <TopHeader variant="page" />

    <div class="pivot-body">
      <aside class="pivot-sidebar">
        <nav class="pivot-menu">
          <!-- 数据查询 - 路由菜单项 -->
          <RouterLink
            class="pivot-menu-card pivot-menu-header"
            :class="{ active: isQueryRoute }"
            to="/queryPivot/query"
          >
            <span class="pivot-menu-icon">
              <img src="../../assets/queryPivot/query.png"  />
            </span>
            <span class="pivot-menu-label">数据查询</span>
            <img class="pivot-menu-arrow" src="../../assets/queryPivot/arrow_right.png"  />

          </RouterLink>

          <!-- 数据评估 - 可展开手风琴 -->
          <div
            class="pivot-menu-card"
            :class="{ active: isAssessRoute, expanded: assessExpanded }"
          >
            <div class="pivot-menu-header" @click="handleAssessClick">
              <span class="pivot-menu-icon">
                <img src="../../assets/queryPivot/assess.png"  />
              </span>
              <span class="pivot-menu-label">数据评估</span>
              <img class="pivot-menu-arrow" :class="{ expanded: assessExpanded }" src="../../assets/queryPivot/arrow_right.png"  />
            </div>

            <Transition
              :css="false"
              @enter="onEnter"
              @leave="onLeave"
            >
              <div v-if="assessExpanded" class="pivot-menu-sub">
                <!-- 城市筛选 -->
                <div class="city-filter">
                  <button
                    v-for="city in cities"
                    :key="city.code"
                    class="city-btn"
                    :class="{ active: selectedCity === city.name }"
                    @click="handleCityClick(city.name)"
                  >{{ city.name }}</button>
                </div>

                <!-- 文件列表 -->
                <div class="file-list">
                  <div class="file-list-title"><img src="../../assets/home/doc.png" alt="">文件列表</div>
                  <div
                    v-for="file in files"
                    :key="file.name"
                    class="file-item"
                    @click="handleFileClick(file)"
                  >
                    <span class="file-icon">
                      <img src="../../assets/queryPivot/zip.png" alt="">
                    </span>
                    <span class="file-name">{{ file.name }}</span>
                    <button class="file-download" @click.stop="handleDownload(file)">
                      <img src="../../assets/queryPivot/download.png" alt="">
                    </button>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </nav>
      </aside>

      <main class="pivot-main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import TopHeader from '@/components/common/TopHeader.vue'
import { useQueryPivotStore } from '@/store'
import { getForecastData, downloadSJPGMoShiFile } from '@/api/queryPivot'

const route = useRoute()
const router = useRouter()
const isQueryRoute = computed(() => route.path.startsWith('/queryPivot/query'))
const isAssessRoute = computed(() => route.path.startsWith('/queryPivot/assess'))

const assessExpanded = ref(isAssessRoute.value)

const handleAssessClick = () => {
  if (!isAssessRoute.value) {
    router.push('/queryPivot/assess')
    assessExpanded.value = true
    return
  }
  assessExpanded.value = !assessExpanded.value
}

// 离开评估页时收起手风琴
watch(isAssessRoute, (val) => {
  if (!val) assessExpanded.value = false
})

// 过渡动画
function onEnter(el: Element, done: () => void) {
  const target = el as HTMLElement
  target.style.height = '0'
  target.style.overflow = 'hidden'
  target.style.opacity = '0'
  // 先让浏览器记录 height:0 的状态，下一帧再展开
  nextTick(() => {
    target.style.transition = 'height 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.32s ease'
    target.style.height = target.scrollHeight + 'px'
    target.style.opacity = '1'
    const finish = () => {
      target.style.transition = ''
      target.style.height = ''
      target.style.overflow = ''
      target.style.opacity = ''
      done()
    }
    target.addEventListener('transitionend', finish, { once: true })
    // 兜底
    setTimeout(finish, 360)
  })
}

function onLeave(el: Element, done: () => void) {
  const target = el as HTMLElement
  target.style.height = target.scrollHeight + 'px'
  target.style.overflow = 'hidden'
  target.style.opacity = '1'
  // 强制重排，确保起始高度生效
  void target.offsetHeight
  target.style.transition = 'height 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.32s ease'
  target.style.height = '0'
  target.style.opacity = '0'
  const finish = () => {
    target.style.transition = ''
    target.style.height = ''
    target.style.overflow = ''
    target.style.opacity = ''
    done()
  }
  target.addEventListener('transitionend', finish, { once: true })
  setTimeout(finish, 360)
}

const queryPivotStore = useQueryPivotStore()
const selectedCity = computed(() => queryPivotStore.selectedCity)
const cities = queryPivotStore.stations

const handleCityClick = (city: string) => {
  queryPivotStore.setSelectedCity(city)
}

interface FileItem {
  name: string
  filePath: string
}

const files = ref<FileItem[]>([])

// 根据一级 tab 决定文件列表的 prodCode：昨日评估 result_zip，今日预报 forecast_zip
const fileListProdCode = computed(() =>
  queryPivotStore.activePrimary === 'today' ? 'forecast_zip' : 'result_zip',
)

// 文件列表的时间范围：最近 7 天（今天往前推 7 天到今天）
const fileListTimeRange = computed(() => ({
  startTime: dayjs().subtract(7, 'day').format('YYYYMMDD000000'),
  endTime: dayjs().format('YYYYMMDD000000'),
}))

async function loadFileList() {
  try {
    const res = await getForecastData({
      prodCode: fileListProdCode.value,
      ...fileListTimeRange.value,
    })
    const list = Array.isArray(res.DS) ? res.DS : []
    files.value = list.map((item) => {
      const raw = item as Record<string, unknown>
      const filePath = String(raw.filePath ?? '')
      const ptime = String(raw.ptime ?? '')
      return { name: ptime.slice(0, 8), filePath }
    })
  } catch (error) {
    console.error(error)
  }
}

const handleFileClick = (file: FileItem) => {
  ElMessage.info(`预览文件：${file.name}`)
}

const handleDownload = async (file: FileItem) => {
  if (!file.filePath) return
  try {
    const blob = await downloadSJPGMoShiFile({
      filePath: file.filePath.replace(/\//g, '@'),
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.filePath.split('/').pop() || `${file.name}.zip`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    ElMessage.success(`开始下载：${file.name}`)
  } catch (error) {
    console.error(error)
  }
}

onMounted(loadFileList)

watch(
  () => queryPivotStore.activePrimary,
  () => {
    loadFileList()
  },
)
</script>

<style lang="less" scoped>
.pivot-root {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 50% 20%, rgba(0, 118, 178, 0.28), transparent 33%),
    linear-gradient(180deg, #07192d 0%, #06101e 100%);
}

.pivot-body {
  flex: 1;
  min-height: 0;
  display: flex;
  padding: clamp(0.8rem, 1.4vw, 1rem);
  gap: clamp(0.8rem, 1.4vw, 1.2rem);
}

.pivot-sidebar {
  flex: 0 0 clamp(13rem, 14vw, 17rem);
  padding: 0.8rem;
  background: linear-gradient(180deg, rgba(15, 70, 130, 0.78), rgba(6, 35, 77, 0.76));
  border: 1px solid rgba(42, 156, 238, 0.28);
  border-radius: 0.3rem;
}

.pivot-menu {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

/* 菜单卡片（数据查询 / 数据评估） */
.pivot-menu-card {
  display: block;
  text-decoration: none;
  color: inherit;
  background: linear-gradient(180deg, rgba(10, 45, 92, 0.55), rgba(6, 28, 62, 0.55));
  border: 1px solid rgba(42, 156, 238, 0.28);
  border-radius: 0.35rem;
  overflow: hidden;
  transition: border-color 0.22s ease, background 0.22s ease, box-shadow 0.22s ease;
}

.pivot-menu-card:hover {
  border-color: rgba(68, 210, 255, 0.5);
}

.pivot-menu-card.active {
  border-color: rgba(68, 210, 255, 0.7);
  box-shadow: 0 0 0.7rem rgba(34, 167, 255, 0.28), inset 0 0 0.6rem rgba(34, 167, 255, 0.12);
}

.pivot-menu-header {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.85rem 0.95rem;
  cursor: pointer;
  color: #c3e8f8;
  font-size: clamp(0.95rem, 0.95vw, 1.1rem);
  letter-spacing: 0.04em;
  user-select: none;
}

.pivot-menu-card.active .pivot-menu-header {
  color: #fff;
  text-shadow: 0 0 0.5rem rgba(68, 210, 255, 0.6);
}

.pivot-menu-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #5ac8ff;
  img{
    width: clamp(1.4rem, 0.8vw, 1.6rem);
  }
}

.pivot-menu-card.active .pivot-menu-icon {
  color: #8af0ff;
}

.pivot-menu-label {
  flex: 1;
  font-weight: 600;
}

.pivot-menu-arrow {
  width: clamp(0.3rem, 0.8vw, 0.5rem);
  line-height: 1;
  color: #7fb8e6;
  transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
}

.pivot-menu-arrow.expanded {
  transform: rotate(90deg);
}

/* 展开子区域 */
.pivot-menu-sub {
  padding: 0.2rem 0.85rem 0.85rem;
  border-top: 1px dashed rgba(42, 156, 238, 0.25);
}

/* 城市筛选 */
.city-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem 0 0.85rem;
}

.city-btn {
  min-width: 3.6rem;
  padding: 0.4rem 0.7rem;
  color: #9bcaf5;
  font-size: clamp(0.8rem, 0.8vw, 0.92rem);
  background: rgba(8, 38, 78, 0.5);
  border: 1px solid rgba(42, 156, 238, 0.35);
  border-radius: 0.3rem;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.city-btn:hover {
  color: #fff;
  border-color: rgba(68, 210, 255, 0.6);
}

.city-btn.active {
  color: #fff;
  background: linear-gradient(180deg, rgba(42, 126, 255, 0.92), rgba(14, 86, 200, 0.92));
  border-color: rgba(120, 210, 255, 0.85);
  box-shadow: 0 0 0.5rem rgba(34, 167, 255, 0.4);
}

/* 文件列表 */
.file-list {
  background: rgba(8, 34, 72, 0.6);
  border: 1px solid rgba(42, 156, 238, 0.22);
  border-radius: 0.3rem;
  padding: 0.7rem 0.6rem;
}

.file-list-title {
  margin-bottom: 0.55rem;
  padding-left: 0.25rem;
  color: #bfe3ff;
  font-size: clamp(0.85rem, 0.85vw, 0.98rem);
  font-weight: 600;
  letter-spacing: 0.04em;
  img{
    width: clamp(0.5rem, 0.8vw, 0.8rem);
    margin-right: 0.25rem;
  }
}

.file-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.55rem;
  margin-bottom: 0.4rem;
  background: rgba(10, 45, 92, 0.4);
  border: 1px solid rgba(42, 156, 238, 0.2);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.file-item:last-child {
  margin-bottom: 0;
}

.file-item:hover {
  background: rgba(34, 167, 255, 0.12);
  border-color: rgba(68, 210, 255, 0.5);
}

.file-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  img{
    width: clamp(1.2rem, 0.8vw, 1.4rem);
  }
}

.file-name {
  flex: 1;
  color: #dff8ff;
  font-size: clamp(0.82rem, 0.82vw, 0.95rem);
  letter-spacing: 0.05em;
}

.file-download {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  color: #7fb8e6;
  background: transparent;
  border: none;
  border-radius: 0.2rem;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
  img{
    width: clamp(0.6rem, 0.8vw, 0.8rem);
  }
}

.file-download:hover {
  color: #8af0ff;
  background: rgba(34, 167, 255, 0.18);
}

.pivot-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(0.8rem, 1.4vw, 1.4rem);
  // overflow: auto;
}
</style>

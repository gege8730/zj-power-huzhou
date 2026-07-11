<template>
  <el-dialog
    v-model="dialogVisible"
    :append-to-body="true"
    :close-on-click-modal="false"
    :destroy-on-close="false"
    :show-close="false"
    class="pdf-preview-dialog"
    width="96vw"
    top="2vh"
    @closed="handleClosed"
  >
    <button class="pdf-close-btn" type="button" @click="dialogVisible = false">×</button>

    <div class="pdf-preview-shell">
      <aside class="pdf-material-aside">
        <div class="pdf-aside-title">
          <div class="pdf-title-text">重要材料</div>
        </div>

        <div class="pdf-tab-grid">
          <button
            v-for="(tab, index) in tabs"
            :key="tab"
            class="pdf-tab-button"
            :class="{ active: index === activeTabIndex }"
            type="button"
            @click="handleTabChange(index)"
          >
            {{ tab }}
          </button>
        </div>

        <div class="pdf-file-list custom-scrollbar">
          <button
            v-for="item in pagedFiles"
            :key="`${item.title}-${item.updateTime}`"
            class="pdf-file-card"
            :class="{ active: isSameMaterial(item, selectedFile) }"
            type="button"
            @click="selectFile(item)"
          >
            <span class="pdf-file-icon"><img src="../../assets/word.png" alt="icon" /></span>
            <span class="pdf-file-info">
              <span class="pdf-file-title">{{ item.title }}</span>
              <span class="pdf-file-time">{{ item.updateTime }}</span>
            </span>
          </button>

          <el-empty v-if="pagedFiles.length === 0" :image-size="72" description="暂无材料" />
        </div>

        <div class="pdf-page-bar">
          <span class="pdf-total">共 {{ tabFiles.length }} 条</span>
          <button class="pdf-page-btn" type="button" :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">
            ‹
          </button>
          <button
            v-for="page in pagerItems"
            :key="page"
            class="pdf-page-btn"
            :class="{ active: page === currentPage, ellipsis: typeof page !== 'number' }"
            type="button"
            :disabled="typeof page !== 'number'"
            @click="typeof page === 'number' && changePage(page)"
          >
            {{ typeof page === 'number' ? page : '...' }}
          </button>
          <button class="pdf-page-btn" type="button" :disabled="currentPage >= pageCount" @click="changePage(currentPage + 1)">
            ›
          </button>
        </div>
      </aside>

      <main class="pdf-viewer-wrap">
        <div class="pdf-viewer-body" v-loading="loading">
          <iframe
            v-if="previewSrc"
            :key="previewKey"
            class="pdf-frame"
            :src="previewSrc"
            title="PDF 预览"
            @load="loading = false"
          ></iframe>
          <el-empty v-else description="暂无可预览文件" />
        </div>
      </main>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { MaterialFile } from '../../types/dashboard'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    file: MaterialFile | null
    files?: MaterialFile[]
    tabs?: string[]
  }>(),
  {
    files: () => [],
    tabs: () => []
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const pageSize = 9
const loading = ref(false)
const currentPage = ref(1)
const activeTabIndex = ref(0)
const selectedFile = ref<MaterialFile | null>(null)
const previewRevision = ref(0)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const allFiles = computed(() => {
  if (props.files?.length) return props.files
  return props.file ? [props.file] : []
})

const tabs = computed(() => {
  if (props.tabs?.length) return props.tabs
  const fileTypes = allFiles.value.map(getMaterialType).filter(Boolean)
  return Array.from(new Set(fileTypes))
})

const activeTab = computed(() => tabs.value[activeTabIndex.value] || '')
const hasTypeField = computed(() => allFiles.value.some((item) => Boolean(getMaterialType(item))))

const tabFiles = computed(() => {
  if (!hasTypeField.value || !activeTab.value) return allFiles.value
  return allFiles.value.filter((item) => getMaterialType(item) === activeTab.value)
})

const pageCount = computed(() => Math.max(1, Math.ceil(tabFiles.value.length / pageSize)))

const pagedFiles = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return tabFiles.value.slice(start, start + pageSize)
})

const pagerItems = computed<Array<number | string>>(() => {
  const total = pageCount.value
  const current = currentPage.value

  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const items: Array<number | string> = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) items.push('prev-ellipsis')
  for (let page = start; page <= end; page += 1) items.push(page)
  if (end < total - 1) items.push('next-ellipsis')
  items.push(total)

  return items
})

const publicBase = import.meta.env.BASE_URL || '/'
const apiBase = import.meta.env.VITE_APP_BASE_API || ''

function getMaterialType(file: MaterialFile | null) {
  return file?.category || file?.type || ''
}

function normalizePublicUrl(url: string) {
  const normalized = url.trim()
  if (/^(https?:)?\/\//.test(normalized) || normalized.startsWith('blob:') || normalized.startsWith('data:')) return normalized
  if (normalized.startsWith('/sph-main/hz/api')) return normalized
  if (normalized.startsWith('/hz/api')) return import.meta.env.PROD ? `/sph-main${normalized}` : normalized
  if (normalized.startsWith('/api/')) return `${apiBase}${normalized}`
  return `${publicBase}${normalized.replace(/^\//, '')}`
}

const previewSrc = computed(() => {
  const url = selectedFile.value?.pdfUrl || selectedFile.value?.filePath || ''
  if (!url) return ''

  const normalizedUrl = normalizePublicUrl(url)
  return `${encodeURI(normalizedUrl)}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`
})

const previewKey = computed(() => {
  const file = selectedFile.value
  if (!file) return `${previewRevision.value}-${previewSrc.value}`
  return `${previewRevision.value}-${file.title}-${file.updateTime}-${previewSrc.value}`
})

function isSameMaterial(a?: MaterialFile | null, b?: MaterialFile | null) {
  if (!a || !b) return false
  return a.title === b.title && a.updateTime === b.updateTime
}

function findPageByFile(file: MaterialFile | null) {
  if (!file) return 1
  const index = tabFiles.value.findIndex((item) => isSameMaterial(item, file))
  return index >= 0 ? Math.floor(index / pageSize) + 1 : 1
}

function syncActiveTab(file: MaterialFile | null) {
  const type = getMaterialType(file)
  if (!type || !tabs.value.length) return

  const index = tabs.value.findIndex((tab) => tab === type)
  if (index >= 0) activeTabIndex.value = index
}

function initSelectedFile(file: MaterialFile | null) {
  const nextFile = file || allFiles.value[0] || null
  selectedFile.value = nextFile
  syncActiveTab(selectedFile.value)
  previewRevision.value += 1
  loading.value = Boolean(nextFile?.pdfUrl || nextFile?.filePath)

  nextTick(() => {
    currentPage.value = findPageByFile(selectedFile.value)
  })
}

function handleTabChange(index: number) {
  activeTabIndex.value = index
  currentPage.value = 1

  nextTick(() => {
    const nextFile = tabFiles.value[0] || null
    if (!tabFiles.value.length) {
      selectedFile.value = null
      loading.value = false
      return
    }

    if (!tabFiles.value.some((item) => isSameMaterial(item, selectedFile.value))) {
      selectFile(nextFile as MaterialFile)
    }
  })
}

function selectFile(file: MaterialFile) {
  selectedFile.value = file
  previewRevision.value += 1
  loading.value = Boolean(file.pdfUrl || file.filePath)
}

function changePage(page: number) {
  currentPage.value = Math.min(Math.max(page, 1), pageCount.value)
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) initSelectedFile(props.file)
  }
)

watch(
  () => props.file,
  (file) => {
    if (props.modelValue) initSelectedFile(file)
  }
)

watch(pageCount, (count) => {
  if (currentPage.value > count) currentPage.value = count
})

const handleClosed = () => {
  loading.value = false
}
</script>

<style scoped>
.pdf-preview-shell {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: clamp(19rem, 20vw, 24rem) minmax(0, 1fr);
  gap: 0.6rem;
  padding: 0.55rem;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(9, 35, 70, 0.96), rgba(3, 15, 34, 0.98));
}

.pdf-material-aside {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(58, 181, 255, 0.42);
  background: linear-gradient(180deg, rgba(6, 58, 111, 0.96), rgba(3, 35, 76, 0.97));
  box-shadow: inset 0 0 1.4rem rgba(46, 161, 255, 0.18);
}

.pdf-aside-title {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  min-height: clamp(2.25rem, 4vh, 2.8rem);
  padding: 0.36rem 0.8rem;
  background: linear-gradient(90deg, rgba(20, 93, 164, 0.98), rgba(10, 61, 123, 0.84));
  border-bottom: 1px solid rgba(76, 194, 255, 0.26);
}

.pdf-title-text {
  position: relative;
  padding-left: 1.35rem;
  color: #eafcff;
  font-size: clamp(0.95rem, 0.92vw, 1.1rem);
  font-style: italic;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-shadow: 0 0 0.55rem rgba(89, 220, 255, 0.86);
  white-space: nowrap;
}

.pdf-title-text::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  width: 0.72rem;
  height: 0.72rem;
  transform: translateY(-50%);
  border: 1px solid #4ccfff;
  background: radial-gradient(circle, #78f5ff 0 24%, #168bdc 28% 62%, rgba(19, 130, 222, 0.36) 65%);
  box-shadow: 0 0 0.5rem rgba(64, 207, 255, 0.85);
}


.pdf-tab-grid {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.48rem;
  padding: 0.55rem 0.7rem 0.45rem;
}

.pdf-tab-button {
  position: relative;
  height: clamp(1.75rem, 3.1vh, 2.1rem);
  padding: 0 0.2rem;
  color: #f0fbff;
  border: 1px solid rgba(28, 155, 232, 0.28);
  border-radius: 0.23rem;
  background: linear-gradient(180deg, rgba(0, 92, 160, 0.96), rgba(0, 67, 128, 0.96));
  box-shadow: inset 0 0 0.75rem rgba(72, 194, 255, 0.12);
  cursor: pointer;
  font-size: clamp(0.72rem, 0.68vw, 0.84rem);
  line-height: 1;
}

.pdf-tab-button.active,
.pdf-tab-button:hover {
  border-color: rgba(80, 215, 255, 0.72);
  background: linear-gradient(180deg, rgba(0, 115, 202, 0.96), rgba(0, 74, 145, 0.96));
}


.pdf-file-list {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.15rem 0.7rem 0.45rem;
}

.pdf-file-card {
  width: 100%;
  min-height: clamp(3rem, 5.1vh, 3.7rem);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 0.65rem;
  color: #eafcff;
  border: 1px solid rgba(24, 128, 219, 0.34);
  border-radius: 0.18rem;
  background: rgba(9, 48, 93, 0.88);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.pdf-file-card:hover {
  transform: translateX(0.08rem);
  border-color: rgba(62, 196, 255, 0.58);
  background: rgba(12, 68, 128, 0.94);
}

.pdf-file-card.active {
  border-color: rgba(64, 196, 255, 0.86);
  background: linear-gradient(180deg, rgba(7, 79, 147, 0.98), rgba(7, 55, 115, 0.98));
  box-shadow: inset 0 0 1.2rem rgba(44, 171, 255, 0.28), 0 0 0.45rem rgba(37, 159, 255, 0.28);
}

.pdf-file-icon {
  flex: 0 0 auto;
  filter: drop-shadow(0 0 0.46rem rgba(74, 221, 255, 0.78));
}

.pdf-file-icon img {
  display: block;
  width: clamp(2rem, 1.85vw, 2.35rem);
  height: clamp(2rem, 1.85vw, 2.35rem);
}

.pdf-file-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.24rem;
}

.pdf-file-title {
  overflow: hidden;
  color: #eafcff;
  font-size: clamp(0.82rem, 0.82vw, 0.98rem);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pdf-file-time {
  color: #8ee8ff;
  font-size: clamp(0.68rem, 0.64vw, 0.8rem);
}

.pdf-page-bar {
  flex: 0 0 auto;
  min-height: clamp(2.1rem, 3.7vh, 2.55rem);
  display: flex;
  align-items: center;
  gap: 0.38rem;
  padding: 0.35rem 0.7rem 0.55rem;
  color: #d9f8ff;
  border-top: 1px solid rgba(65, 182, 255, 0.2);
}

.pdf-total {
  margin-right: auto;
  color: #cdefff;
  font-size: clamp(0.68rem, 0.62vw, 0.8rem);
  white-space: nowrap;
}

.pdf-page-btn {
  min-width: clamp(1.45rem, 1.55vw, 1.85rem);
  height: clamp(1.45rem, 2.5vh, 1.75rem);
  padding: 0 0.25rem;
  color: #dff7ff;
  border: 1px solid rgba(44, 151, 230, 0.44);
  border-radius: 0.14rem;
  background: rgba(5, 72, 132, 0.92);
  cursor: pointer;
  line-height: 1;
}

.pdf-page-btn.active,
.pdf-page-btn:not(:disabled):hover {
  color: #fff;
  border-color: rgba(72, 206, 255, 0.86);
  background: rgba(18, 128, 225, 0.98);
}

.pdf-page-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.pdf-page-btn.ellipsis {
  cursor: default;
  opacity: 0.85;
}

.pdf-viewer-wrap {
  position: relative;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(192, 208, 220, 0.62);
  background: #2e2e2e;
}

.pdf-viewer-body {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #2b2b2b;
}

.pdf-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
  background: #2f2f2f;
}

.pdf-close-btn {
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  z-index: 3000;
  width: 1.85rem;
  height: 1.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #eafcff;
  border: 1px solid rgba(152, 216, 255, 0.5);
  border-radius: 50%;
  background: rgba(0, 31, 62, 0.86);
  cursor: pointer;
  font-size: 1.35rem;
  line-height: 1;
  pointer-events: auto;
}

.pdf-close-btn:hover {
  color: #fff;
  border-color: rgba(116, 226, 255, 0.85);
  background: rgba(5, 75, 139, 0.82);
}
</style>

<style>
.pdf-preview-dialog.el-dialog {
  height: 92vh;
  max-height: calc(100vh - 4vh);
  margin-bottom: 0;
  overflow: hidden;
  border: 1px solid rgba(63, 194, 255, 0.58);
  background: rgba(2, 16, 36, 0.98);
  box-shadow: 0 0 1.8rem rgba(0, 0, 0, 0.58), inset 0 0 1.4rem rgba(46, 170, 255, 0.18);
}

.pdf-preview-dialog .el-dialog__header {
  display: none;
}

.pdf-preview-dialog .el-dialog__body {
  position: relative;
  height: 100%;
  padding: 0;
  overflow: hidden;
}

.pdf-preview-dialog .el-empty {
  --el-empty-fill-color-0: rgba(255, 255, 255, 0.75);
  --el-empty-fill-color-1: rgba(147, 190, 220, 0.65);
  --el-empty-fill-color-2: rgba(88, 139, 183, 0.56);
  --el-empty-fill-color-3: rgba(56, 102, 151, 0.48);
  --el-empty-fill-color-4: rgba(40, 83, 127, 0.5);
  --el-empty-fill-color-5: rgba(30, 63, 103, 0.55);
  --el-empty-fill-color-6: rgba(18, 48, 84, 0.62);
  --el-empty-fill-color-7: rgba(13, 36, 68, 0.72);
  --el-empty-fill-color-8: rgba(8, 27, 53, 0.82);
  --el-empty-fill-color-9: rgba(4, 19, 40, 0.92);
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.pdf-preview-dialog .el-empty__description p {
  color: #bcecff;
}

@media (max-width: 1280px) {
  .pdf-preview-dialog.el-dialog {
    width: 98vw !important;
  }
}
</style>

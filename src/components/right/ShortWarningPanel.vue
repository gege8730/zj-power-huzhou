<template>
  <BasePanel title="短临告警" class-name="short-warning">
    <div class="warning-time">数据时间：{{ rows.observeTime }}</div>
    <div class="warning-table-wrap custom-scrollbar">
      <table class="warning-table" aria-label="短临告警风险表">
        <thead>
          <tr>
            <th>乡　镇</th>
            <th>当前实况</th>
            <th v-for="hour in futureHours" :key="hour">{{ hour }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in warningRows" :key="row.town">
            <td class="town-cell" :title="row.town"><span>{{ row.town }}</span></td>
            <td :class="riskClass(row.hours[0]?.risk)">{{ riskText(row.hours[0]?.risk) }}</td>
            <td v-for="hour in row.hours.slice(1)" :key="hour.time" :class="riskClass(hour.risk)">{{ riskText(hour.risk) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </BasePanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BasePanel from '../common/BasePanel.vue'

interface WarningItem {
  town: string
  hours: Array<{
    time: string
    risk: string
  }>
}

interface WarningPanelRows {
  observeTime?: string
  warning?: WarningItem[]
}

const props = defineProps<{
  rows: WarningPanelRows
}>()

const warningRows = computed(() => props.rows.warning ?? [])

// 从第一行数据的 hours（跳过第一个 realtime）中提取未来小时的时间标签
const futureHours = computed(() => {
  const firstHours = warningRows.value[0]?.hours ?? []
  if (firstHours.length > 1) {
    return firstHours.slice(1).map(h => h.time)
  }
  return []
})

const riskMap: Record<string, string> = {
  '0': '低风险',
  '1': '中风险',
  '2': '高风险',
  '低风险': '低风险',
  '中风险': '中风险',
  '高风险': '高风险',
}

const riskLevelMap: Record<string, 'low' | 'middle' | 'high'> = {
  '0': 'low',
  '1': 'middle',
  '2': 'high',
  '低风险': 'low',
  '中风险': 'middle',
  '高风险': 'high',
}

const riskText = (risk?: string) => riskMap[risk ?? ''] ?? risk ?? ''

const riskClass = (risk?: string) => ({
  risk: true,
  low: riskLevelMap[risk ?? ''] === 'low',
  middle: riskLevelMap[risk ?? ''] === 'middle',
  high: riskLevelMap[risk ?? ''] === 'high',
})
</script>

<style scoped>
.short-warning {
  flex: 0 0 37.5%;
  min-height: 20rem;
  position: relative;
  z-index: 1;
}

.short-warning :deep(.panel-body) {
  padding: clamp(0.55rem, 0.85vh, 0.75rem) clamp(0.55rem, 0.8vw, 0.78rem) clamp(0.55rem, 0.8vh, 0.72rem);
  overflow: visible !important;
}

.warning-time {
  position: absolute;
  right: 0.9rem;
  top: calc(clamp(2.05rem, 3.3vh, 2.6rem) * -0.82);
  color: #c3e8f8;
  font-size: clamp(0.72rem, 0.74vw, 0.9rem);
}

.warning-table-wrap {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 0.1rem;
}

.warning-table {
  width: 100%;
  min-height: 100%;
  border-collapse: separate;
  border-spacing: clamp(0.16rem, 0.22vw, 0.24rem) clamp(0.18rem, 0.28vh, 0.28rem);
  table-layout: fixed;
  color: #f7fdff;
  font-size: clamp(0.72rem, 0.78vw, 0.95rem);
  line-height: 1;
  text-align: center;
}

.warning-table thead {
  position: sticky;
  top: 0;
  z-index: 3;
  background: #061b37;
}

.warning-table th {
  position: sticky;
  top: 0;
  z-index: 4;
  height: clamp(1.8rem, 3vh, 2.25rem);
  border: 1px solid rgba(22, 177, 255, 0.58);
  color: #dff4ff;
  font-weight: 700;
  background: linear-gradient(180deg, #174a84 0%, #0c3264 100%);
  box-shadow:
    inset 0 0 0.24rem rgba(112, 213, 255, 0.1),
    inset 0 0 0.58rem rgba(35, 177, 255, 0.1);
  white-space: nowrap;
}

.warning-table td {
  height: clamp(1.7rem, 2.8vh, 2.15rem);
  padding: 0 0.2rem;
  border: 1px solid rgba(22, 177, 255, 0.58);
  background:
    radial-gradient(ellipse at center, rgba(0, 18, 45, 0.5) 0%, rgba(4, 37, 78, 0.34) 48%, transparent 72%),
    linear-gradient(90deg, rgba(28, 128, 205, 0.26) 0%, rgba(8, 51, 101, 0.72) 18%, rgba(8, 51, 101, 0.72) 82%, rgba(28, 128, 205, 0.26) 100%),
    linear-gradient(180deg, rgba(20, 78, 139, 0.76), rgba(7, 42, 86, 0.82));
  box-shadow:
    inset 0 0 0.24rem rgba(112, 213, 255, 0.1),
    inset 0 0 0.58rem rgba(35, 177, 255, 0.1),
    0 0 0.2rem rgba(16, 130, 226, 0.12);
  vertical-align: middle;
}

.warning-table th:first-child,
.warning-table td:first-child {
  width: 19%;
}

.town-cell span {
  display: block;
  max-width: 5em;
  margin: 0 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.warning-table td.risk {
  --risk-border: rgba(109, 234, 190, 0.66);
  --risk-core: rgba(0, 35, 38, 0.48);
  --risk-edge: rgba(93, 238, 166, 0.28);
  --risk-main: rgba(11, 132, 94, 0.88);
  --risk-top: rgba(27, 164, 108, 0.9);
  --risk-deep: rgba(3, 98, 80, 0.95);
  --risk-rim: rgba(202, 255, 219, 0.16);
  --risk-glow: rgba(44, 211, 146, 0.16);
  border-color: var(--risk-border);
  background:
    radial-gradient(ellipse at center, var(--risk-core) 0%, rgba(0, 18, 25, 0.28) 44%, transparent 68%),
    linear-gradient(90deg, var(--risk-edge) 0%, var(--risk-main) 18%, var(--risk-main) 82%, var(--risk-edge) 100%),
    linear-gradient(180deg, var(--risk-top), var(--risk-deep));
  box-shadow:
    inset 0 0 0.34rem var(--risk-rim),
    inset 0 0 0.9rem var(--risk-edge),
    0 0 0.35rem var(--risk-glow);
}

.warning-table td.risk.low {
  --risk-border: rgba(93, 238, 166, 0.68);
  --risk-core: rgba(0, 52, 48, 0.5);
  --risk-edge: rgba(80, 235, 156, 0.3);
  --risk-main: rgba(13, 142, 97, 0.9);
  --risk-top: rgba(31, 174, 113, 0.9);
  --risk-deep: rgba(5, 105, 82, 0.95);
  --risk-rim: rgba(204, 255, 219, 0.18);
  --risk-glow: rgba(44, 211, 146, 0.16);
}

.warning-table td.risk.middle {
  --risk-border: rgba(236, 238, 94, 0.68);
  --risk-core: rgba(65, 62, 0, 0.5);
  --risk-edge: rgba(235, 231, 61, 0.32);
  --risk-main: rgba(140, 140, 20, 0.9);
  --risk-top: rgba(186, 181, 39, 0.9);
  --risk-deep: rgba(110, 113, 15, 0.95);
  --risk-rim: rgba(255, 255, 198, 0.18);
  --risk-glow: rgba(224, 220, 45, 0.14);
}

.warning-table td.risk.high {
  --risk-border: rgba(255, 92, 114, 0.68);
  --risk-core: rgba(67, 6, 32, 0.52);
  --risk-edge: rgba(239, 73, 94, 0.32);
  --risk-main: rgba(142, 34, 59, 0.9);
  --risk-top: rgba(176, 57, 76, 0.9);
  --risk-deep: rgba(108, 25, 52, 0.95);
  --risk-rim: rgba(255, 202, 207, 0.16);
  --risk-glow: rgba(226, 56, 82, 0.16);
}
</style>

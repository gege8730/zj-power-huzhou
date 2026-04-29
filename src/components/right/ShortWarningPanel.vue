<template>
  <BasePanel title="短临告警" class-name="short-warning">
    <div class="warning-time">数据时间：2026/04/15 14:30</div>
    <table class="warning-table">
      <thead>
        <tr>
          <th>乡　镇</th>
          <th>当前实况</th>
          <th>16:00</th>
          <th>17:00</th>
          <th>18:00</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="`${row.town}-${row.h18.risk}-${row.h16.risk}`">
          <td>{{ row.town }}</td>
          <td :class="riskClass(row.realtime.risk)">{{ row.realtime.risk }}</td>
          <td :class="riskClass(row.h16.risk)">{{ row.h16.risk }}</td>
          <td :class="riskClass(row.h17.risk)">{{ row.h17.risk }}</td>
          <td :class="riskClass(row.h18.risk)">{{ row.h18.risk }}</td>
        </tr>
      </tbody>
    </table>
  </BasePanel>
</template>

<script setup lang="ts">
import type { WarningRow } from '../../types/dashboard'
import BasePanel from '../common/BasePanel.vue'

defineProps<{
  rows: WarningRow[]
}>()

const riskClass = (risk: WarningRow['realtime']['risk']) => ({
  risk: true,
  low: risk === '低风险',
  middle: risk === '中风险',
  high: risk === '高风险'
})
</script>

<style scoped>
.short-warning {
  flex: 0 0 37.5%;
  min-height: 20rem;
}

.warning-time {
  position: absolute;
  right: 0.9rem;
  top: calc(clamp(2.05rem, 3.3vh, 2.6rem) * -0.72);
  color: #d9f5ff;
  font-size: clamp(0.72rem, 0.74vw, 0.9rem);
}

.warning-table {
  width: 100%;
  height: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  color: #f7fdff;
  font-size: clamp(0.72rem, 0.78vw, 0.95rem);
  text-align: center;
}

.warning-table th {
  height: 2rem;
  color: #dff4ff;
  font-weight: 700;
  background: rgba(18, 81, 151, 0.46);
}

.warning-table td {
  height: 1.82rem;
  border: 1px solid rgba(20, 160, 255, 0.76);
  background: rgba(11, 65, 124, 0.58);
}

.warning-table th:first-child,
.warning-table td:first-child {
  width: 18%;
}

.risk.low {
  background: linear-gradient(180deg, rgba(16, 154, 112, 0.88), rgba(3, 105, 86, 0.88));
}

.risk.middle {
  background: linear-gradient(180deg, rgba(185, 173, 30, 0.9), rgba(116, 116, 18, 0.88));
}

.risk.high {
  background: linear-gradient(180deg, rgba(168, 62, 76, 0.95), rgba(110, 35, 58, 0.9));
}
</style>

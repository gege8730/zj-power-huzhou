<template>
  <div class="query-page">
    <!-- 顶部筛选栏 -->
    <section class="top-bar">
      <div class="top-filters">
        <div class="filter-item">
          <span class="filter-label">选择市</span>
          <el-select
            v-model="topForm.city"
            class="filter-control filter-control--short"
          >
            <el-option label="湖州市" value="huzhou" />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="filter-label">选择区县</span>
          <el-select
            v-model="topForm.district"
            class="filter-control filter-control--short"
          >
            <el-option label="市本级" value="city" />
            <el-option label="长兴县" value="changxing" />
            <el-option label="德清县" value="deqing" />
            <el-option label="安吉县" value="anji" />
            <el-option label="南浔区" value="nanxun" />
          </el-select>
        </div>
      </div>
      <div class="top-actions">
        <el-button class="action-btn" type="primary" @click="handleDownload">
          <img src="../../../assets/queryPivot/download.png" class="btn-icon" />
          数据下载
        </el-button>
        <el-button class="action-btn" @click="handleClear">
          <img src="../../../assets/queryPivot/delete.png" class="btn-icon" />
          全部清空
        </el-button>
      </div>
    </section>

    <!-- 双查询面板 -->
    <div class="query-panels">
      <!-- 实况查询 -->
      <section class="query-card">
        <div class="query-card-title">
          <el-checkbox v-model="liveForm.enabled" label="实况查询" />
        </div>
        <div class="query-card-body">
          <div class="query-row">
            <span class="row-label">时间范围</span>
            <el-date-picker
              v-model="liveForm.timeStart"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              class="date-control"
              :disabled-date="disabledPastDate"
              :default-time="defaultStartTime"
            />
            <span class="row-sep">至</span>
            <el-date-picker
              v-model="liveForm.timeEnd"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              class="date-control"
              :disabled-date="disabledPastDate"
              :default-time="defaultEndTime"
            />
          </div>
          <div class="query-row">
            <span class="row-label">查询方式</span>
            <el-radio-group
              v-model="liveForm.queryMode"
              @change="handleLiveModeChange"
            >
              <el-radio label="hourly">小时查询</el-radio>
              <el-radio label="period">时段查询</el-radio>
            </el-radio-group>
          </div>
          <div class="query-row">
            <span class="row-label">要素选择</span>
            <el-checkbox-group
              v-model="liveForm.factors"
              class="factor-group"
            >
              <el-checkbox
                v-for="f in liveFactorOptions"
                :key="f.value"
                :label="f.value"
                >{{ f.label }}</el-checkbox
              >
            </el-checkbox-group>
          </div>
          <div class="query-row query-row--btn">
            <el-button
              class="query-submit"
              type="primary"
              :loading="liveLoading"
              @click="handleLiveQuery"
              >查询</el-button
            >
          </div>
        </div>
      </section>

      <!-- 预报查询 -->
      <section class="query-card">
        <div class="query-card-title">
          <el-checkbox v-model="forecastForm.enabled" label="预报查询" />
        </div>
        <div class="query-card-body">
          <div class="query-row">
            <span class="row-label">起报时间</span>
            <el-date-picker
              v-model="forecastForm.startTime"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              class="date-control"
              :disabled-date="disabledFutureDate"
              :disabled-hours="disabledForecastHours"
              :disabled-minutes="disabledForecastMinutes"
              :disabled-seconds="disabledForecastSeconds"
              :default-time="defaultForecastTime"
            />
          </div>
          <div class="query-row">
            <span class="row-label">预报时效</span>
            <el-radio-group v-model="forecastForm.hourSelect">
              <el-radio label="hour12">12小时</el-radio>
              <el-radio label="hour24">24小时</el-radio>
            </el-radio-group>
          </div>
          <div class="query-row">
            <span class="row-label">要素选择</span>
            <el-checkbox-group
              v-model="forecastForm.factors"
              class="factor-group"
            >
              <el-checkbox
                v-for="f in factorOptions"
                :key="f.value"
                :label="f.value"
                >{{ f.label }}</el-checkbox
              >
            </el-checkbox-group>
          </div>
          <div class="query-row query-row--btn">
            <el-button
              class="query-submit"
              type="primary"
              :loading="forecastLoading"
              @click="handleForecastQuery"
              >查询</el-button
            >
          </div>
        </div>
      </section>
    </div>

    <!-- 查询结果 -->
    <section class="result-panel">
      <div class="panel-title-block">
        <span class="panel-text" data-title="查询结果">查询结果</span>
      </div>
      <div class="panel-body">
        <el-table
          class="query-result-table"
          :data="tableRows"
          :span-method="mergeDistrict"
          height="100%"
          size="default"
          border
        >
          <el-table-column
            prop="district"
            label="区县"
            width="100"
            fixed
            align="center"
          />
          <el-table-column
            prop="street"
            label="街道"
            width="110"
            fixed
            align="center"
          />
          <el-table-column label="实况数据" align="center">
            <el-table-column
              label="2026-08-17 00:00~2026-08-17 23:59"
              align="center"
            >
              <el-table-column
                prop="liveWeather"
                label="天气状况"
                min-width="110"
                align="center"
              />
              <el-table-column
                prop="liveTemp"
                label="气温(℃)"
                min-width="90"
                align="center"
              />
              <el-table-column
                prop="liveRain"
                label="累计降水量(mm)"
                min-width="130"
                align="center"
              />
              <el-table-column
                prop="liveWind"
                label="极大风速(m/s)"
                min-width="130"
                align="center"
              />
            </el-table-column>
          </el-table-column>
          <el-table-column label="预报数据" align="center">
            <el-table-column
              label="2026-08-18 08:00起报24小时预报数据"
              align="center"
            >
              <el-table-column
                prop="fcWeather"
                label="天气状况"
                min-width="110"
                align="center"
              />
              <el-table-column
                prop="fcTemp"
                label="气温(℃)"
                min-width="90"
                align="center"
              />
              <el-table-column
                prop="fcRain"
                label="累计降水量(mm)"
                min-width="130"
                align="center"
              />
              <el-table-column
                prop="fcWind"
                label="极大风速(m/s)"
                min-width="130"
                align="center"
              />
            </el-table-column>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { ElMessage } from "element-plus";

// 预报查询的要素选项（固定不变）
const factorOptions = [
  { value: "weather", label: "天气" },
  { value: "temp", label: "气温" },
  { value: "rain", label: "降水" },
  { value: "wind", label: "极大风速" },
];

// 实况查询方式对应要素集：小时查询 / 时段查询
const liveFactorSets: Record<string, { value: string; label: string }[]> = {
  hourly: [
    { value: "weather", label: "天气现象" },
    { value: "hourlyRain", label: "小时降水" },
    { value: "maxWind", label: "极大风" },
    { value: "avgTemp", label: "平均气温" },
  ],
  period: [
    { value: "weather", label: "天气现象" },
    { value: "totalRain", label: "累计降水" },
    { value: "maxWind", label: "极大风" },
    { value: "avgTemp", label: "平均气温" },
    { value: "maxTemp", label: "最高气温" },
    { value: "minTemp", label: "最低气温" },
  ],
};

// 时间范围限制：仅可选过去 3 天（今天 + 前 2 天）
function disabledPastDate(date: Date): boolean {
  const now = new Date();
  const min = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 2,
    0,
    0,
    0,
    0,
  );
  const max = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  return date < min || date > max;
}

// el-date-picker 的 default-time：起始默认 00:00:00，结束默认 23:59:59
const defaultStartTime = new Date(2000, 0, 1, 0, 0, 0);
const defaultEndTime = new Date(2000, 0, 1, 23, 59, 59);

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function formatDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
// 实况查询默认起始 = 3 天前 00:00:00
function defaultLiveTimeStart(): string {
  const now = new Date();
  return formatDateTime(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0, 0),
  );
}
// 实况查询默认结束 = 今天 23:59:59
function defaultLiveTimeEnd(): string {
  const now = new Date();
  return formatDateTime(
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 0),
  );
}

// 预报查询：限制日期为未来 3 天（今天 + 后 2 天）
function disabledFutureDate(date: Date): boolean {
  const now = new Date();
  const min = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const max = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 2,
    23,
    59,
    59,
    999,
  );
  return date < min || date > max;
}

// 预报查询默认起报日期 = 今天
function defaultForecastDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// 预报查询起报时次限制：仅允许 08:00:00 和 20:00:00
// disabled-hours/minutes/seconds 返回需禁用的下标数组
function disabledForecastHours(): number[] {
  return Array.from({ length: 24 }, (_, i) => i).filter((h) => h !== 8 && h !== 20);
}
function disabledForecastMinutes(): number[] {
  return Array.from({ length: 60 }, (_, i) => i).filter((m) => m !== 0);
}
function disabledForecastSeconds(): number[] {
  return Array.from({ length: 60 }, (_, i) => i).filter((s) => s !== 0);
}

// el-date-picker 的 default-time：选日期后默认填充 08:00:00
const defaultForecastTime = new Date(2000, 0, 1, 8, 0, 0);

// 预报查询默认起报时间 = 今天 08:00:00
function defaultForecastStartTime(): string {
  return `${defaultForecastDate()} 08:00:00`;
}

const topForm = reactive({
  city: "huzhou",
  district: "city",
});

const liveForm = reactive({
  enabled: true,
  timeStart: defaultLiveTimeStart(),
  timeEnd: defaultLiveTimeEnd(),
  queryMode: "hourly",
  factors: ["weather", "hourlyRain", "maxWind", "avgTemp"],
});

// 实况查询要素选项：跟随查询方式切换
const liveFactorOptions = computed(
  () => liveFactorSets[liveForm.queryMode] ?? [],
);

// 切换查询方式时，要素选择重置为新方式的全集
function handleLiveModeChange(mode: string) {
  const set = liveFactorSets[mode];
  if (set) liveForm.factors = set.map((f) => f.value);
}

const forecastForm = reactive({
  enabled: true,
  // 起报时间：日期 + 时次（仅 08:00:00 / 20:00:00，由 picker 限制）
  startTime: defaultForecastStartTime(),
  hourSelect: "hour24",
  factors: ["weather", "temp", "rain", "wind"] as string[],
});

const liveLoading = ref(false);
const forecastLoading = ref(false);

interface ResultRow {
  district: string;
  street: string;
  liveWeather: string;
  liveTemp: number;
  liveRain: number;
  liveWind: number;
  fcWeather: string;
  fcTemp: number;
  fcRain: number;
  fcWind: number;
}

const tableRows = ref<ResultRow[]>([
  {
    district: "长兴县",
    street: "龙山街道",
    liveWeather: "阴",
    liveTemp: 25.6,
    liveRain: 96,
    liveWind: 22.2,
    fcWeather: "小雨",
    fcTemp: 26.8,
    fcRain: 96,
    fcWind: 22.2,
  },
  {
    district: "长兴县",
    street: "太湖街道",
    liveWeather: "多云",
    liveTemp: 25.2,
    liveRain: 99,
    liveWind: 23.1,
    fcWeather: "小雨",
    fcTemp: 26.4,
    fcRain: 99,
    fcWind: 23.1,
  },
  {
    district: "长兴县",
    street: "水口乡",
    liveWeather: "多云",
    liveTemp: 24.8,
    liveRain: 100,
    liveWind: 21.3,
    fcWeather: "阴",
    fcTemp: 25.5,
    fcRain: 100,
    fcWind: 21.3,
  },
  {
    district: "长兴县",
    street: "夹浦镇",
    liveWeather: "小雨",
    liveTemp: 24.1,
    liveRain: 88,
    liveWind: 19.8,
    fcWeather: "小雨",
    fcTemp: 25.0,
    fcRain: 88,
    fcWind: 19.8,
  },
  {
    district: "德清县",
    street: "虹星桥镇",
    liveWeather: "阴",
    liveTemp: 24.3,
    liveRain: 92,
    liveWind: 20.5,
    fcWeather: "阴",
    fcTemp: 25.6,
    fcRain: 92,
    fcWind: 20.5,
  },
  {
    district: "德清县",
    street: "武康街道",
    liveWeather: "阴",
    liveTemp: 25.1,
    liveRain: 91,
    liveWind: 20.9,
    fcWeather: "阴",
    fcTemp: 26.2,
    fcRain: 91,
    fcWind: 20.9,
  },
  {
    district: "德清县",
    street: "乾元镇",
    liveWeather: "小雨",
    liveTemp: 24.6,
    liveRain: 78,
    liveWind: 18.7,
    fcWeather: "阴",
    fcTemp: 25.1,
    fcRain: 78,
    fcWind: 18.7,
  },
  {
    district: "德清县",
    street: "新市镇",
    liveWeather: "阴",
    liveTemp: 24.8,
    liveRain: 85,
    liveWind: 19.3,
    fcWeather: "小雨",
    fcTemp: 25.6,
    fcRain: 85,
    fcWind: 19.3,
  },
  {
    district: "德清县",
    street: "新安镇",
    liveWeather: "多云",
    liveTemp: 25.0,
    liveRain: 90,
    liveWind: 20.1,
    fcWeather: "阴",
    fcTemp: 25.9,
    fcRain: 90,
    fcWind: 20.1,
  },
  {
    district: "德清县",
    street: "舞阳街道",
    liveWeather: "小雨",
    liveTemp: 24.7,
    liveRain: 82,
    liveWind: 18.9,
    fcWeather: "阴",
    fcTemp: 25.3,
    fcRain: 82,
    fcWind: 18.9,
  },
]);

// 相同区县合并单元格
function mergeDistrict({
  row,
  column,
  rowIndex,
}: {
  row: ResultRow;
  column: { property: string };
  rowIndex: number;
}) {
  if (column.property !== "district") return;
  const data = tableRows.value;
  const current = row.district;
  // 与上一行不同 → 本组第一行，计算连续相同行数
  if (rowIndex === 0 || data[rowIndex - 1].district !== current) {
    let span = 1;
    for (let i = rowIndex + 1; i < data.length; i++) {
      if (data[i].district === current) span++;
      else break;
    }
    return { rowspan: span, colspan: 1 };
  }
  // 非首行 → 隐藏
  return { rowspan: 0, colspan: 0 };
}

function handleLiveQuery() {
  if (!liveForm.enabled) {
    ElMessage.warning("请先勾选实况查询");
    return;
  }
  if (!liveForm.timeStart || !liveForm.timeEnd) {
    ElMessage.warning("请选择时间范围");
    return;
  }
  liveLoading.value = true;
  setTimeout(() => {
    liveLoading.value = false;
    ElMessage.success("实况查询完成（当前为示例数据）");
  }, 500);
}

function handleForecastQuery() {
  if (!forecastForm.enabled) {
    ElMessage.warning("请先勾选预报查询");
    return;
  }
  if (!forecastForm.startTime) {
    ElMessage.warning("请选择起报时间");
    return;
  }
  forecastLoading.value = true;
  setTimeout(() => {
    forecastLoading.value = false;
    ElMessage.success("预报查询完成（当前为示例数据）");
  }, 500);
}

function handleDownload() {
  ElMessage.success("开始下载查询结果（当前为示例）");
}

function handleClear() {
  liveForm.timeStart = "";
  liveForm.timeEnd = "";
  forecastForm.startTime = "";
  tableRows.value = [];
  ElMessage.info("已清空");
}
</script>

<style lang="less" scoped>
.query-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(0.7rem, 1.2vw, 1.1rem);
  border: 1px solid rgba(42, 156, 238, 0.28);
  border-radius: 0.3rem;
  padding: 0.8rem;
  background: linear-gradient(
    180deg,
    rgba(15, 70, 130, 0.78),
    rgba(6, 35, 77, 0.76)
  );
}

/* 顶部筛选栏 */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  border-radius: 0.3rem;
}

.top-filters {
  display: flex;
  gap: clamp(1rem, 1.5vw, 2rem);
}

.top-actions {
  display: flex;
  gap: 0.7rem;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-label {
  color: #9bcaf5;
  font-size: clamp(0.85rem, 0.85vw, 1rem);
  white-space: nowrap;
}

.filter-control--short {
  width: 9rem;
}

.action-btn {
  width: clamp(6rem, 12vw, 7.5rem);
  height: clamp(2.6rem, 2.8vh, 2rem);
  padding: 0 0.9rem;
  font-size: clamp(0.8rem, 0.8vw, 0.92rem);
  background-color: #013764 !important;
  border-color: #368de4 !important;
  color: #fff;
}

.btn-icon {
  width: 1rem;
  height: 1rem;
  margin-right: 0.4rem;
}

/* 双查询面板 */
.query-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(0.7rem, 1.2vw, 1.1rem);
  flex: 0 0 auto;
}

.query-card {
  background: rgba(10, 45, 92, 0.5);
  border: 1px solid rgba(42, 156, 238, 0.28);
  border-radius: 0.3rem;
  overflow: hidden;
}

.query-card-title {
  padding: 0.6rem 1rem;
  background: rgba(19, 79, 146, 0.4);
  border-bottom: 1px solid rgba(42, 156, 238, 0.22);
}

.query-card-body {
  padding: 0.8rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.query-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.row-label {
  color: #9bcaf5;
  font-size: clamp(0.82rem, 0.82vw, 0.95rem);
  white-space: nowrap;
  min-width: 4.5rem;
}

.row-sep {
  color: #9bcaf5;
  font-size: clamp(0.82rem, 0.82vw, 0.95rem);
}

.date-control {
  width: 12rem;
}

.factor-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.query-row--btn {
  justify-content: center;
  padding-top: 0.3rem;
}

.query-submit {
  min-width: 7rem;
  height: clamp(1.7rem, 2.8vh, 2rem);
}

/* 结果面板 */
.result-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: rgba(10, 45, 92, 0.4);
  border: 1px solid rgba(42, 156, 238, 0.28);
  border-radius: 0.3rem;
  overflow: hidden;
}

.result-panel .panel-title-block {
  flex: 0 0 auto;
  padding: 0.55rem 1rem;
  background: rgba(19, 79, 146, 0.4);
  border-bottom: 1px solid rgba(42, 156, 238, 0.22);
}

.result-panel .panel-text {
  color: #cfe6f5;
  font-size: clamp(0.9rem, 0.9vw, 1.05rem);
  font-weight: 600;
}

.result-panel .panel-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* el-table 深度覆盖：复用 assess 页面深蓝科技风 */
.query-result-table {
  height: 100%;
  background-color: #031d42;
  color: #cfe6f5;
  font-size: clamp(0.78rem, 0.8vw, 0.92rem);
  --el-table-bg-color: #031d42;
  --el-table-tr-bg-color: #031d42;
  --el-table-border-color: rgba(42, 156, 238, 0.22);
  --el-table-text-color: #cfe6f5;
  --el-table-header-text-color: #fff;
  --el-table-row-hover-bg-color: rgba(34, 167, 255, 0.18);
  --el-fill-color-lighter: #031d42;
  --el-fill-color-blank: #031d42;

  :deep(.el-table__inner-wrapper) {
    background: #031d42;
  }

  :deep(.el-table::before) {
    background: rgba(42, 156, 238, 0.28);
  }

  //  表头
  :deep(.el-table__header-wrapper th.el-table__cell) {
    background: rgba(19, 79, 146, 0.75);
    color: #fff;
    font-weight: 600;
    letter-spacing: 0.03em;
    border-color: rgba(42, 156, 238, 0.28);
    border-right: 2px solid rgba(42, 156, 238, 0.22) !important;
    border-bottom: 2px solid rgba(42, 156, 238, 0.35);
  }

  // 表体单元格
  :deep(.el-table__body-wrapper td.el-table__cell) {
    background: #031d42 !important;
    color: #cfe6f5;
    border-color: rgba(42, 156, 238, 0.22);
    border-right: 2px solid rgba(42, 156, 238, 0.22) !important;
    border-bottom: 2px solid rgba(42, 156, 238, 0.35);
  }

  // hover 高亮
  :deep(.el-table__body tr:hover > td.el-table__cell) {
    background: rgba(34, 167, 255, 0.18) !important;
  }

  // fixed 列背景保障
  :deep(.el-table__fixed),
  :deep(.el-table__fixed-right) {
    background: #031d42;
  }

  :deep(.el-table__fixed .el-table__body-wrapper td.el-table__cell),
  :deep(.el-table__fixed-right .el-table__body-wrapper td.el-table__cell) {
    background: #031d42 !important;
  }
}

// Element Plus 控件深色覆盖
:deep(.el-select .el-input__wrapper),
:deep(.el-date-editor) {
  background: rgba(0, 57, 103, 0.9) !important;
  box-shadow: none !important;
  // border: 1px solid rgba(51, 110, 199, 0.6);
}

:deep(.el-select .el-input.is-focus .el-input__wrapper) {
  box-shadow: none !important;
}
:deep(.el-select .el-select__wrapper) {
  background: rgba(0, 57, 103, 0.9) !important;
  border: 1px solid rgba(3, 76, 188, 1);
  box-shadow: none !important;
  color: #fff;
}

:deep(.el-select .el-input__suffix) {
  background: transparent !important;
  border: none !important;
}

:deep(.el-input__inner) {
  color: #dff8ff;
  background: transparent;
}

// el-date-editor 内部所有可能残留白色的区域
:deep(.el-date-editor.el-input),
:deep(.el-date-editor.el-input__wrapper) {
  background: rgba(0, 57, 103, 0.9) !important;
}

:deep(.el-date-editor .el-input__wrapper) {
  background: rgba(0, 57, 103, 0.9) !important;
  box-shadow: none !important;
  border: 1px solid rgba(51, 110, 199, 0.6);
}

:deep(.el-date-editor .el-range-separator) {
  background: transparent !important;
  color: #9bcaf5;
}

:deep(.el-date-editor .el-range-input) {
  background: transparent !important;
  color: #dff8ff;
}

:deep(.el-date-editor .el-input__icon) {
  color: #9bcaf5;
}

:deep(.el-checkbox__label) {
  color: #cfe6f5;
}

:deep(.el-checkbox__inner) {
  background: transparent;
  border-color: rgba(51, 110, 199, 0.6);
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background: #2a7eff;
  border-color: #2a7eff;
}

/* 单选框深色主题 */
:deep(.el-radio__label) {
  color: #cfe6f5;
}

:deep(.el-radio__inner) {
  background: transparent;
  border-color: rgba(51, 110, 199, 0.6);
}

:deep(.el-radio__input.is-checked .el-radio__inner) {
  background: #2a7eff;
  border-color: #2a7eff;
}

:deep(.el-radio__input.is-checked + .el-radio__label) {
  color: #fff;
}
:deep(.el-select__selected-item.el-select__placeholder) {
  color: #fff !important;
  font-size: clamp(0.8rem, 0.8vw, 0.92rem);
}
</style>

<style lang="less">
.el-select__popper.el-popper,
.el-picker__popper.el-popper {
  background: #031d42 !important;
  border: 1px solid rgba(42, 156, 238, 0.4) !important;

  .el-popper__arrow::before {
    background: #031d42 !important;
    border-top-color: rgba(42, 156, 238, 0.4) !important;
    border-left-color: rgba(42, 156, 238, 0.4) !important;
  }
}

.el-select-dropdown__item {
  background-color: transparent !important;
  color: #cfe6f5;

  &.is-selected,
  &:hover,
  &.is-hovering,
  &.is-selected.is-hovering {
    background-color: rgba(34, 167, 255, 0.18) !important;
    color: #fff;
  }
}

// 日期选择器面板（含时间选择，teleport 到 body，必须用非 scoped）
.el-date-picker,
.el-picker-panel.el-date-picker {
  background: #031d42 !important;
  color: #cfe6f5;
  border-color: rgba(42, 156, 238, 0.4) !important;
  --el-fill-color-light: transparent;
  --el-fill-color-blank: transparent;
  --el-bg-color: #031d42;
  --el-bg-color-overlay: #031d42;

  .el-date-picker__header-label,
  .el-date-table th {
    color: #9bcaf5;
  }

  // 表格单元格去掉 hover/范围外的白色残留
  .el-date-table td {
    background: transparent;
  }

  .el-date-table td div {
    background: transparent;
  }

  // 当前日期：去掉蓝色高亮（用户要求 background: none）
  .el-date-table td.current:not(.disabled) div {
    background: none !important;
    color: #2a7eff;
  }

  .el-date-table td.in-range div,
  .el-date-table td.in-range div:hover {
    background: rgba(34, 167, 255, 0.2);
  }

  .el-date-table td.available:hover div,
  .el-date-table td div:hover {
    background: rgba(34, 167, 255, 0.18);
  }
}

// 日期/时间选择器底部确认区
.el-picker-panel__footer,
.el-time-panel__footer {
  background: #031d42 !important;
  border-top: 1px solid rgba(42, 156, 238, 0.28) !important;

  .el-button {
    background: #013764 !important;
    border-color: #368de4 !important;
    color: #fff;

    &.is-plain {
      background: transparent !important;
      color: #9bcaf5;
    }

    &:hover {
      background: #02539b !important;
    }
  }
}

// 时间选择面板
.el-time-panel {
  background: #031d42 !important;
  border-color: rgba(42, 156, 238, 0.4) !important;
  color: #cfe6f5;
  --el-fill-color-light: transparent;
  --el-fill-color-blank: transparent;

  .el-time-spinner__wrapper {
    background: #031d42;
  }

  .el-time-spinner__wrapper .el-scrollbar__wrap {
    background: #031d42;
  }

  .el-time-spinner__wrapper .el-scrollbar__view {
    background: #031d42;
  }

  .el-time-spinner__item {
    background: transparent !important;
    color: #cfe6f5;

    &.is-active {
      color: #fff;
    }

    &:hover:not(.disabled) {
      background: rgba(34, 167, 255, 0.18) !important;
    }
  }

  .el-time-panel__btn {
    color: #9bcaf5;

    &.confirm {
      color: #2a7eff;
    }
  }
}

// 日期选择器弹窗内 input
.el-picker-panel .el-input__wrapper {
  background: rgba(0, 57, 103, 0.9) !important;
  box-shadow: none !important;
  border: 1px solid rgba(51, 110, 199, 0.6);

  .el-input__inner {
    color: #dff8ff;
  }
}
.el-date-picker__time-header {
  border-bottom: 1px solid rgba(42, 156, 238, 0.4) !important;
}
.el-date-table th {
  border-bottom: 1px solid rgba(42, 156, 238, 0.4) !important;
}
</style>

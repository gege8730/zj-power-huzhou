<template>
  <div class="assess-page">
    <!-- 一级 tab + 字段说明开关 -->
    <div class="primary-tabs">
      <button
        v-for="tab in primaryTabs"
        :key="tab.key"
        class="primary-tab"
        :class="{ active: activePrimary === tab.key }"
        @click="handlePrimaryClick(tab)"
      >
        {{ tab.label }}
      </button>
      <!-- 字段说明开关按钮 + 浮层（包裹容器，浮层相对按钮右侧定位） -->
      <div class="notes-wrapper" v-if="tabNotes.length">
        <button
          class="notes-toggle"
          :class="{ active: showNotes }"
          @click="showNotes = !showNotes"
          title="点击查看字段说明"
        >
          <svg class="info-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 11a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Z"
              fill="currentColor"
            />
          </svg>
        </button>
        <!-- 字段说明浮层（绝对定位在按钮右侧，不占布局空间） -->
        <Transition name="notes-pop">
          <div v-if="showNotes" class="tab-notes">
            <p v-for="(line, idx) in tabNotes" :key="idx">{{ line }}</p>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 数据表格 -->
    <section class="data-panel">
      <!-- 面板顶栏：仅二级 tab（仅昨日评估时显示） -->
      <div class="panel-header" v-if="activePrimary === 'yesterday'">
        <div class="secondary-tabs">
          <button
            v-for="tab in secondaryTabs"
            :key="tab.key"
            class="secondary-tab"
            :class="{ active: activeSecondary === tab.key }"
            @click="handleSecondaryClick(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>
      <!-- 虚拟滚动表格：仅渲染可视区域行，适配千条级数据 -->
      <div
        v-loading="loading"
        element-loading-text="加载中…"
        element-loading-background="rgba(3, 29, 66, 0.88)"
        class="assess-table"
      >
        <!-- 昨日预报：普通 el-table + 多级表头（按模型分组） -->
        <el-table
          v-if="isForecast"
          :data="tableRows"
          height="100%"
          border
          class="forecast-table"
        >
          <el-table-column
            prop="time"
            label="时间"
            width="160"
            fixed
            align="center"
            :formatter="(_r: unknown, _c: unknown, val: unknown) => formatValue('time', val)"
          />
          <el-table-column
            v-for="group in forecastGroups"
            :key="group.label"
            :label="group.label"
            align="center"
          >
            <el-table-column
              v-for="col in group.columns"
              :key="col.prop"
              :prop="col.prop"
              :label="col.label"
              width="160"
              align="center"
              :formatter="(_r: unknown, _c: unknown, val: unknown) => formatValue(col.prop, val)"
            />
          </el-table-column>
        </el-table>
        <!-- 其他 tab：虚拟滚动表格，仅渲染可视区域行，适配千条级数据 -->
        <el-auto-resizer v-else>
          <template #default="{ height, width }">
            <el-table-v2
              :data="tableRows"
              :columns="v2Columns"
              :width="width"
              :height="height"
              :header-height="46"
              :row-height="42"
              row-key="__rowKey"
              :fixed="isTableFixed(width)"
            />
          </template>
        </el-auto-resizer>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import type { Column } from "element-plus";
import { getSJPGMoShiFile, getForecastData } from "@/api/queryPivot";
import { useQueryPivotStore } from "@/store";
import type { PrimaryTabKey } from "@/store";
interface PrimaryTab {
  key: PrimaryTabKey;
  label: string;
}

const primaryTabs: PrimaryTab[] = [
  { key: "yesterday", label: "昨日评估" },
  { key: "today", label: "今日预报" },
];

const secondaryTabs = [
  { key: "live", label: "昨日实况", prodCode: "Act" },
  { key: "forecast", label: "昨日预报", prodCode: "Fore" },
  { key: "metric", label: "评估指标", prodCode: "Assess" },
  { key: "recommend", label: "推优结果", prodCode: "Model-Select" },
];

const activeSecondary = ref("live");
const showNotes = ref(false);

const queryPivotStore = useQueryPivotStore();
const { activePrimary } = storeToRefs(queryPivotStore);

// 接口返回的原始数据（未映射），用于动态表头取键值
const rawData = ref<Record<string, string>[]>([]);
const loading = ref(false);

// 仅「昨日评估 - 昨日实况」使用固定中文表头
const isLive = computed(
  () => activePrimary.value === "yesterday" && activeSecondary.value === "live",
);

// 「昨日评估 - 昨日预报」走普通 el-table（多级表头），其余 tab 走 el-table-v2 虚拟滚动
const isForecast = computed(
  () =>
    activePrimary.value === "yesterday" && activeSecondary.value === "forecast",
);

// 「昨日预报」字段按模型分组（用于 el-table 多级表头）：
// 只渲染数据中实际存在的列，避免接口缺字段时空列出现
interface ForecastGroupCol {
  prop: string;
  label: string;
}
interface ForecastGroup {
  label: string;
  columns: ForecastGroupCol[];
}
const forecastGroups = computed<ForecastGroup[]>(() => {
  const first = rawData.value[0];
  const keys = first ? new Set(Object.keys(first)) : null;
  const keep = (cols: ForecastGroupCol[]) =>
    keys ? cols.filter((c) => keys.has(c.prop)) : cols;

  return (
    [
      {
        label: "Ruler（省智能网格）",
        columns: keep([
          { prop: "temperature_Ruler", label: "温度（℃）" },
          { prop: "relative_humidity_Ruler", label: "相对湿度（%）" },
          { prop: "precipitation_Ruler", label: "降水（mm）" },
          { prop: "wind_speed_Ruler", label: "风速（m/s）" },
          { prop: "apparent_temp_Ruler", label: "体感温度（℃）" },
          { prop: "cloud_Ruler", label: "云量（%）" },
        ]),
      },
      {
        label: "EC_Meteo（欧洲中心预报）",
        columns: keep([
          { prop: "temperature_EC_Meteo", label: "温度（℃）" },
          { prop: "relative_humidity_EC_Meteo", label: "相对湿度（%）" },
          { prop: "precipitation_EC_Meteo", label: "降水（mm）" },
          { prop: "wind_speed_EC_Meteo", label: "风速（m/s）" },
          { prop: "apparent_temp_EC_Meteo", label: "体感温度（℃）" },
          { prop: "cloud_EC_Meteo", label: "云量（%）" },
        ]),
      },
      {
        label: "SCMOC（国家智能网格）",
        columns: keep([
          { prop: "temperature_SCMOC", label: "温度（℃）" },
          { prop: "relative_humidity_SCMOC", label: "相对湿度（%）" },
          { prop: "precipitation_SCMOC", label: "降水（mm）" },
          { prop: "wind_speed_SCMOC", label: "风速（m/s）" },
          { prop: "apparent_temp_SCMOC", label: "体感温度（℃）" },
        ]),
      },
      {
        label: "EC_Rad",
        columns: keep([
          { prop: "radiation_EC_Rad", label: "辐射/㎡）" },
        ]),
      },
      {
        label: "WSP_Rad",
        columns: keep([
          { prop: "radiation_WSP_Rad", label: "辐射（W/㎡）" },
        ]),
      }
    ] as ForecastGroup[]
  ).filter((g) => g.columns.length > 0);
});

// "2026090800" -> "2026-09-08 00:00"；非 10 位纯数字（如已格式化过）原样返回
function formatTime(t: string): string {
  if (/^\d{10}$/.test(t)) {
    return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)} ${t.slice(8, 10)}:00`;
  }
  return t;
}

// 按产品类型拉取评估文件内容并返回原始行数据
async function fetchAssessData(prodCode: string): Promise<Record<string, string>[]> {
  const res = await getForecastData({ prodCode });
  const list = Array.isArray(res.DS) ? res.DS : [];
  if (!list.length) return [];

  // 从数据列表中找出 filePath 包含当前站点值的那一条
  const station = queryPivotStore.stationCode;
  const matched =
    list.find((item) =>
      String((item as Record<string, unknown>)?.filePath ?? "").includes(station),
    ) ?? list[0];

  const filePath =
    String((matched as Record<string, unknown>)?.filePath ?? "").replace(
      /\//g,
      "@",
    ) || "";
  if (!filePath) return [];

  const data = await getSJPGMoShiFile({ filePath });
  const ds = data.DS;
  if (!Array.isArray(ds)) return [];
  // 附加行内唯一 key，供 el-table-v2 的 row-key 使用（不参与列生成）
  return ds.map((item, idx) => ({
    ...(item as Record<string, string>),
    __rowKey: String(idx),
  }));
}

// 各 tab 的表头中文映射（未命中的字段保持原 key 作为 label）
const headerMap = computed(() => {
  if (activePrimary.value === "today") {
    return {
      date: "时间",
      tmp: "温度（℃）",
      temperature: "温度（℃）",
      rh: "相对湿度（%）",
      relative_humidity: "相对湿度（%）",
      prcp: "降水（mm）",
      precipitation: "降水（mm）",
      wind_speed: "风速（m/s）",
      rad: "辐射（W/㎡）",
      radiation: "辐射（W/㎡）",
    };
  }
  switch (activeSecondary.value) {
    case "live":
      return {
        time: "时间",
        temperature: "温度（℃）",
        relative_humidity: "相对湿度（%）",
        precipitation: "降水（mm）",
        wind_speed: "风速（m/s）",
        apparent_temp: "体感温度（℃）",
        cloud: "云量（%）",
        radiation: "辐射（W/㎡）",
      };
    case "forecast":
      return {
        time: "时间",
        temperature_Ruler: "Ruler-温度（℃）",
        relative_humidity_Ruler: "Ruler-相对湿度（%）",
        precipitation_Ruler: "Ruler-降水（mm）",
        wind_speed_Ruler: "Ruler-风速（m/s）",
        apparent_temp_Ruler: "Ruler-体感温度（℃）",
        cloud_Ruler: "Ruler-云量（%）",
        temperature_EC_Meteo: "EC-温度（℃）",
        relative_humidity_EC_Meteo: "EC-相对湿度（%）",
        precipitation_EC_Meteo: "EC-降水（mm）",
        wind_speed_EC_Meteo: "EC-风速（m/s）",
        apparent_temp_EC_Meteo: "EC-体感温度（℃）",
        cloud_EC_Meteo: "EC-云量（%）",
        temperature_SCMOC: "SCMOC-温度（℃）",
        relative_humidity_SCMOC: "SCMOC-相对湿度（%）",
        precipitation_SCMOC: "SCMOC-降水（mm）",
        wind_speed_SCMOC: "SCMOC-风速（m/s）",
        apparent_temp_SCMOC: "SCMOC-体感温度（℃）",
        radiation_EC_Rad: "EC_Rad-辐射（W/㎡）",
        radiation_WSP_Rad: "WSP_Rad-辐射（W/㎡）",
      };
    case "metric":
      return {
        要素: "要素",
        模式: "模式",
        RMSE: "均方根误差",
        R2: "决定系数",
        ME: "平均误差",
        MAE: "平均绝对误差",
        n: "样本数",
      };
    default:
      // 推优结果等：保持原字段名
      return {};
  }
});

// 每列基础宽度：列总宽超出容器时按此宽度出横向滚动，否则由 flexGrow 均分铺满
const COLUMN_WIDTH = 180;

// el-table-v2 列配置：根据数据首行键值动态生成，应用中文表头与单元格格式化
const v2Columns = computed<Column<Record<string, string>>[]>(() => {
  const first = rawData.value[0];
  if (!first) return [];
  const map = headerMap.value as Record<string, string>;
  return Object.keys(first)
    .filter((key) => key !== "__rowKey")
    .map((key) => ({
      key,
      dataKey: key,
      title: map[key] ?? key,
      width: COLUMN_WIDTH,
      minWidth: 140,
      flexGrow: 1,
      align: "center",
      cellRenderer: (({ cellData }: { cellData: unknown }) => formatValue(key, cellData)) as any,
    }));
});

// 列总宽超过容器（扣除纵向滚动条 6px）时才开启 fixed：
// fixed 下列保持刚性并出横向滚动条；关闭时 flexGrow 生效，列均分铺满容器
function isTableFixed(containerWidth: number): boolean {
  return v2Columns.value.length * COLUMN_WIDTH > containerWidth - 6;
}

// 行数据：统一直接用原始接口字段
const tableRows = computed(() => rawData.value);

// 各 tab 的字段说明 / 备注信息
const tabNotes = computed<string[]>(() => {
  if (activePrimary.value === "today") {
    return [
      // "字段说明：time: 时间  temperature: 温度  relative_humidity: 相对湿度  wind_speed: 风速  radiation: 辐射",
      "站点说明：湖州: K5454、长兴: 58443、安吉: 58446、德清: 58454、南浔: K5004",
    ];
  }
  switch (activeSecondary.value) {
    case "live":
      return [
        "站点说明：湖州: K5454、长兴: 58443、安吉: 58446、德清: 58454、南浔: K5004",
        // "字段说明：time: 时间  temperature: 温度  relative_humidity: 相对湿度  precipitation: 降水  wind_speed: 风速  apparent_temp: 体感温度  cloud: 云量  radiation: 辐射",
      ];
    case "forecast":
      return [
        "模型说明：EC_Meteo（欧洲中心预报）、Ruler（省智能网格产品）、SCMOC（国家智能网格产品）",
        "站点说明：湖州: K5454、长兴: 58443、安吉: 58446、德清: 58454、南浔: K5004",
        // "字段说明：time: 时间  temperature: 温度  relative_humidity: 相对湿度  precipitation: 降水  wind_speed: 风速  apparent_temp: 体感温度  cloud: 云量  radiation: 辐射",
      ];
    case "metric":
      return [
        "模型说明：EC_Meteo（欧洲中心预报）、Ruler（省智能网格产品）、SCMOC（国家智能网格产品）",
        "要素说明：temperature: 温度、relative_humidity: 相对湿度、precipitation: 降水、wind_speed: 风速、apparent_temp: 体感温度、cloud: 云量、radiation: 辐射",
        "站点说明：湖州: K5454、长兴: 58443、安吉: 58446、德清: 58454、南浔: K5004",
      ];
    case "recommend":
      return [
        "模型说明：EC_Meteo（欧洲中心预报）、Ruler（省智能网格产品）、SCMOC（国家智能网格产品）",
        "要素说明：temperature: 温度、relative_humidity: 相对湿度、precipitation: 降水、wind_speed: 风速、apparent_temp: 体感温度、cloud: 云量、radiation: 辐射",
        "站点说明：湖州: K5454、长兴: 58443、安吉: 58446、德清: 58454、南浔: K5004",
      ];
    default:
      return [
        "站点说明：湖州: K5454、长兴: 58443、安吉: 58446、德清: 58454、南浔: K5004",
      ];
  }
});

// 需要 toFixed(1) 保留一位小数的字段（各 tab 统一使用原始接口字段名）
const toFixedFields = new Set<string>([
  // 昨日实况
  "apparent_temp",
  // 昨日预报
  "wind_speed_Ruler",
  "apparent_temp_Ruler",
  "relative_humidity_Ruler",
  "temperature_EC_Meteo",
  "relative_humidity_EC_Meteo",
  "wind_speed_EC_Meteo",
  "apparent_temp_EC_Meteo",
  "cloud_EC_Meteo",
  "precipitation_EC_Meteo",
  "temperature_SCMOC",
  "relative_humidity_SCMOC",
  "apparent_temp_SCMOC",
  "radiation_EC_Rad",
  "radiation_WSP_Rad",
  // 评估指标
  "RMSE",
  "R2",
  "ME",
  "MAE",
  // 推优结果
  "值1",
  "值2",
  "值3",
  // 今日预报
  "tmp",
  "temperature",
  "rh",
  "relative_humidity",
  "prcp",
  "precipitation",
  "wind_speed",
  "rad",
  "radiation",
]);

// el-table-v2 cellRenderer 用：按字段名格式化单元格值
function formatValue(prop: string, value: unknown): string {
  if (value === "" || value == null) return "-";
  // time 列：原始 10 位数字格式化为 "YYYY-MM-DD HH:00"
  if (prop === "time") return formatTime(String(value));
  // 命中字段且值可转为数字时，保留一位小数
  if (toFixedFields.has(prop)) {
    const num = Number(value);
    if (!Number.isNaN(num)) return num.toFixed(1);
  }
  return String(value);
}

function handleSecondaryClick(key: string) {
  activeSecondary.value = key;
  loadData();
}

// 当前应请求的 prodCode：今日预报用 forecast，昨日评估按二级 tab 取对应值
function currentProdCode(): string {
  if (activePrimary.value === "today") return "forecast";
  const sec = secondaryTabs.find((tab) => tab.key === activeSecondary.value);
  return sec?.prodCode ?? "Act";
}

async function loadData() {
  loading.value = true;
  try {
    rawData.value = await fetchAssessData(currentProdCode());
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

// 一级 tab 切换时动态请求对应接口数据
function handlePrimaryClick(tab: PrimaryTab) {
  queryPivotStore.setActivePrimary(tab.key);
  loadData();
}

onMounted(loadData);

// 城市站点切换时联动刷新
watch(
  () => queryPivotStore.stationCode,
  () => {
    loadData();
  },
);
</script>

<style lang="less" scoped>
.assess-page {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(0.8rem, 1.4vw, 1.4rem);
  border: 1px solid rgba(42, 156, 238, 0.28);
  border-radius: 0.3rem;
  padding: 0.8rem;
  background: linear-gradient(
    180deg,
    rgba(15, 70, 130, 0.78),
    rgba(6, 35, 77, 0.76)
  );
}

/* 单色环绕流动流光边框 */
@property --flow-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

@keyframes flow-border {
  to {
    --flow-angle: 360deg;
  }
}

.primary-tab,
.secondary-tab {
  position: relative;
}

.primary-tab::before,
.secondary-tab::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.5px;
  background: conic-gradient(
    from var(--flow-angle),
    transparent 0%,
    transparent 55%,
    rgba(68, 210, 255, 0.3) 70%,
    #44d2ff 85%,
    rgba(68, 210, 255, 0.3) 98%,
    transparent 100%
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: flow-border 3s linear infinite;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.primary-tab.active::before,
.secondary-tab.active::before {
  opacity: 1;
}

/* 一级 tab */
.primary-tabs {
  display: flex;
  align-items: center;
  gap: clamp(0.8rem, 1.2vw, 1.5rem);
  padding-left: 1.4rem;
}

.primary-tab {
  min-width: clamp(8rem, 10vw, 12rem);
  padding: 0.7rem 1.4rem;
  color: #bfe3ff;
  font-size: clamp(0.95rem, 1vw, 1.1rem);
  font-weight: 600;
  letter-spacing: 0.06em;
  background: rgba(8, 38, 78, 0.5);
  border: 1px solid rgba(42, 156, 238, 0.4);
  border-radius: 0.3rem;
  overflow: hidden;
  cursor: pointer;
  transition:
    color 0.22s ease,
    background 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease;
}

.primary-tab:hover {
  color: #fff;
  border-color: rgba(68, 210, 255, 0.6);
}

.primary-tab.active {
  color: #fff;
  background: linear-gradient(
    180deg,
    rgba(42, 126, 255, 0.92),
    rgba(14, 86, 200, 0.92)
  );
  border-color: rgba(120, 210, 255, 0.85);
  box-shadow:
    0 0 0.7rem rgba(34, 167, 255, 0.45),
    inset 0 0 0.5rem rgba(255, 255, 255, 0.12);
  text-shadow: 0 0 0.4rem rgba(255, 255, 255, 0.5);
}
/* 二级 tab */
.secondary-tabs {
  display: flex;
  gap: clamp(0.5rem, 0.8vw, 1rem);
}

/* 面板顶栏：仅二级 tab（仅昨日评估时显示） */
.panel-header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding-bottom: 1.2rem;
}

/* 字段说明开关按钮 + 浮层包裹容器 */
.notes-wrapper {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
}

/* 字段说明开关按钮（跟随一级 tab 流式布局，小图标样式） */
.notes-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  color: #9bcaf5;
  background: rgba(8, 38, 78, 0.7);
  border: 1px solid rgba(42, 156, 238, 0.5);
  border-radius: 50%;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  .info-icon {
    width: 1.1rem;
    height: 1.1rem;
  }

  &:hover {
    color: #fff;
    border-color: rgba(68, 210, 255, 0.8);
    box-shadow: 0 0 0.5rem rgba(34, 167, 255, 0.45);
    transform: scale(1.08);
  }

  &.active {
    color: #fff;
    background: linear-gradient(
      180deg,
      rgba(34, 167, 255, 0.9),
      rgba(14, 86, 200, 0.9)
    );
    border-color: rgba(120, 210, 255, 0.9);
    box-shadow:
      0 0 0.6rem rgba(34, 167, 255, 0.55),
      inset 0 0 0.3rem rgba(255, 255, 255, 0.18);
  }
}

/* 字段说明展开/收起过渡（绝对定位浮层，不占布局空间） */
.notes-pop-enter-active,
.notes-pop-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.notes-pop-enter-from,
.notes-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.notes-pop-enter-to,
.notes-pop-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.secondary-tab {
  min-width: clamp(5rem, 6vw, 7rem);
  padding: 0.45rem 0.9rem;
  color: #9bcaf5;
  font-size: clamp(0.85rem, 0.85vw, 1rem);
  letter-spacing: 0.04em;
  background: rgba(8, 38, 78, 0.45);
  border: 1px solid rgba(42, 156, 238, 0.35);
  border-radius: 0.25rem;
  overflow: hidden;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.secondary-tab:hover {
  color: #fff;
  border-color: rgba(68, 210, 255, 0.55);
}

.secondary-tab.active {
  color: #fff;
  background: linear-gradient(
    180deg,
    rgba(42, 126, 255, 0.88),
    rgba(14, 86, 200, 0.88)
  );
  border-color: rgba(120, 210, 255, 0.8);
  box-shadow: 0 0 0.5rem rgba(34, 167, 255, 0.4);
}


/* 数据面板 */
.data-panel {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: linear-gradient(
    180deg,
    rgba(10, 45, 92, 0.4),
    rgba(6, 28, 62, 0.4)
  );
  border: 1px solid rgba(42, 156, 238, 0.28);
  border-radius: 0.3rem;
  overflow: hidden;
  padding: 0.8rem;
  border: 1px solid rgba(42, 156, 238, 0.28);
  border-radius: 0.3rem;
}

/* 字段说明 / 备注信息（浮层，相对按钮右侧定位，不占布局空间） */
.tab-notes {
  position: absolute;
  top: 50%;
  left: calc(100% + 0.6rem);
  transform: translateY(-50%);
  z-index: 21;
  min-width: 45rem;
  // max-width: clamp(20rem, 32vw, 34rem);
  padding: 0.6rem 0.9rem 0.6rem 1rem;
  background: linear-gradient(
    90deg,
    rgba(8, 38, 78, 0.96),
    rgba(3, 29, 66, 0.96)
  );
  border: 1px solid rgba(68, 210, 255, 0.45);
  border-left: 3px solid #44d2ff;
  border-radius: 0.25rem;
  color: #cfe6f5;
  font-size: clamp(0.78rem, 0.8vw, 0.9rem);
  line-height: 1.7;
  box-shadow:
    0 0.35rem 0.9rem rgba(0, 0, 0, 0.55),
    0 0 0.5rem rgba(34, 167, 255, 0.25);

  p {
    margin: 0;

    &:not(:last-child) {
      margin-bottom: 0.25rem;
    }

    &::before {
      content: "▸ ";
      color: #44d2ff;
      font-weight: 600;
    }
  }
}

/* el-table-v2 虚拟表格深度覆盖：对齐深蓝科技风 */
.assess-table {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(42, 156, 238, 0.28);
  border-radius: 0.25rem;
  font-size: clamp(0.78rem, 0.8vw, 0.92rem);
  background-color: #031d42;
  color: #cfe6f5;
  /* CSS 变量设在此处，后代 el-table-v2 继承 */
  --el-bg-color: #031d42;
  --el-fill-color-blank: #031d42;
  --el-text-color-regular: #cfe6f5;
  --el-table-row-hover-bg-color: rgba(34, 167, 255, 0.18);

  :deep(.el-table-v2) {
    background: #031d42;
    --el-table-border: none;
    --el-table-row-hover-bg-color: none;
  }

  /* 表头单元格 */
  :deep(.el-table-v2__header-cell) {
    background: rgba(19, 79, 146, 0.75);
    color: #fff;
    font-weight: 600;
    letter-spacing: 0.03em;
    border-right: 2px solid rgba(42, 156, 238, 0.22);
    border-bottom: 2px solid rgba(42, 156, 238, 0.35);
  }

  /* 表体单元格：统一深色背景 + 网格线 */
  :deep(.el-table-v2__row-cell) {
    background: #031d42;
    color: #cfe6f5;
    border-right: 2px solid rgba(42, 156, 238, 0.22);
    border-bottom: 2px solid rgba(42, 156, 238, 0.22);
  }

  /* hover 高亮（行容器加 is-hovered，需覆盖到单元格） */
  :deep(.el-table-v2__row.is-hovered .el-table-v2__row-cell),
  :deep(.el-table-v2__row:hover .el-table-v2__row-cell) {
    background: rgba(34, 167, 255, 0.18);
  }

  /* 空数据文案 */
  :deep(.el-table-v2__empty) {
    color: #8bb8d8;
  }

  /* 加载遮罩：深色背景 + 浅色文案 */
  :deep(.el-loading-mask) {
    background-color: rgba(3, 29, 66, 0.88);
  }

  :deep(.el-loading-text) {
    color: #bfe3ff;
  }

  /* 虚拟滚动条 */
  :deep(.el-virtual-scrollbar) {
    opacity: 0.6;
  }
}

/* 昨日预报：普通 el-table 深色风格（与 el-table-v2 视觉一致） */
.forecast-table {
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

  /* 表头（含分组表头） */
  :deep(.el-table__header-wrapper th.el-table__cell) {
    background: rgba(19, 79, 146, 0.75);
    color: #fff;
    font-weight: 600;
    letter-spacing: 0.03em;
    border-color: rgba(42, 156, 238, 0.28);
    border-right: 2px solid rgba(42, 156, 238, 0.22) !important;
    border-bottom: 2px solid rgba(42, 156, 238, 0.35);
  }

  /* 表体单元格 */
  :deep(.el-table__body-wrapper td.el-table__cell) {
    background: #031d42 !important;
    color: #cfe6f5;
    border-color: rgba(42, 156, 238, 0.22);
    border-right: 2px solid rgba(42, 156, 238, 0.22) !important;
    border-bottom: 2px solid rgba(42, 156, 238, 0.35);
  }

  /* hover 高亮 */
  :deep(.el-table__body tr:hover > td.el-table__cell) {
    background: rgba(34, 167, 255, 0.18) !important;
  }

  /* fixed 列背景保障（时间列 fixed） */
  :deep(.el-table__fixed),
  :deep(.el-table__fixed-right) {
    background: #031d42;
  }

  :deep(.el-table__fixed .el-table__body-wrapper td.el-table__cell),
  :deep(.el-table__fixed-right .el-table__body-wrapper td.el-table__cell) {
    background: #031d42 !important;
  }
}
</style>
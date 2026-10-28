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
            <el-option
              v-for="item in districtOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
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
          <el-checkbox v-model="liveForm.enabled">实况查询</el-checkbox>
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
              <el-radio value="hourly">小时查询</el-radio>
              <el-radio value="period">时段查询</el-radio>
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
                :value="f.value"
                :disabled="!f.supported"
                :title="f.supported ? '' : '接口暂不支持该要素'"
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
          <el-checkbox v-model="forecastForm.enabled">预报查询</el-checkbox>
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
              <el-radio value="hour12">12小时</el-radio>
              <el-radio value="hour24">24小时</el-radio>
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
                :value="f.value"
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

    <!-- 查询结果：实况 / 预报 两张独立表，各自对应一个接口 -->
    <section class="result-panel">
      <div class="panel-title-block">
        <span class="panel-text" data-title="查询结果">查询结果</span>
      </div>
      <div class="panel-body">
        <div class="result-grid">
          <!-- 实况数据表 -->
          <div class="result-table-block">
            <el-table
              class="query-result-table"
              :data="liveRows"
              :span-method="mergeLiveRows"
              height="100%"
              size="default"
              border
              :empty-text="liveEmptyText"
            >
              <el-table-column label="实况数据" align="center">
                <el-table-column :label="liveRangeLabel" align="center">
                  <el-table-column
                    prop="district"
                    label="区县"
                    width="90"
                    align="center"
                  />
                  <el-table-column
                    prop="street"
                    label="街道"
                    width="100"
                    align="center"
                  />
                  <el-table-column
                    v-if="showTimeColumn"
                    prop="time"
                    label="时间"
                    width="110"
                    align="center"
                  />
                  <el-table-column
                    v-if="liveColumnVisible.weather"
                    prop="weather"
                    label="天气状况"
                    min-width="90"
                    align="center"
                  />
                  <el-table-column
                    v-if="liveColumnVisible.temp"
                    prop="temp"
                    label="气温(℃)"
                    min-width="80"
                    align="center"
                  />
                  <el-table-column
                    v-if="liveColumnVisible.rain"
                    prop="rain"
                    :label="rainColumnLabel"
                    min-width="110"
                    align="center"
                  />
                  <el-table-column
                    v-if="liveColumnVisible.wind"
                    prop="wind"
                    label="极大风速(m/s)"
                    min-width="110"
                    align="center"
                  />
                </el-table-column>
              </el-table-column>
            </el-table>
          </div>

          <!-- 预报数据表（接口待接入） -->
          <div class="result-table-block">
            <el-table
              class="query-result-table"
              :data="forecastRows"
              :span-method="mergeForecastRows"
              height="100%"
              size="default"
              border
              :empty-text="forecastEmptyText"
            >
              <el-table-column label="预报数据" align="center">
                <el-table-column :label="forecastRangeLabel" align="center">
                  <el-table-column
                    prop="district"
                    label="区县"
                    width="90"
                    align="center"
                  />
                  <el-table-column
                    prop="street"
                    label="街道"
                    width="100"
                    align="center"
                  />
                  <el-table-column
                    v-if="showForecastTimeColumn"
                    prop="time"
                    label="时间"
                    width="110"
                    align="center"
                  />
                  <el-table-column
                    v-if="forecastColumnVisible.weather"
                    prop="weather"
                    label="天气状况"
                    min-width="90"
                    align="center"
                  />
                  <el-table-column
                    v-if="forecastColumnVisible.temp"
                    prop="temp"
                    label="气温(℃)"
                    min-width="80"
                    align="center"
                  />
                  <el-table-column
                    v-if="forecastColumnVisible.rain"
                    prop="rain"
                    label="累计降水量(mm)"
                    min-width="110"
                    align="center"
                  />
                  <el-table-column
                    v-if="forecastColumnVisible.wind"
                    prop="wind"
                    label="极大风速(m/s)"
                    min-width="110"
                    align="center"
                  />
                </el-table-column>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { ElMessage } from "element-plus";
import dayjs from "dayjs";
import {
  getHzElectriCityStationTownWeather,
  getHzElectriCityForecastTownWeather,
  type TownWeatherItem,
  type TownWeatherQueryType,
} from "@/api/queryPivot";

/** 预报可查询要素编码 */
type ForecastElement = "ww" | "tem" | "pre" | "windEx";

// 预报查询的要素选项：value 对应表格列，element 对应接口要素编码
const factorOptions: Array<{
  value: string;
  label: string;
  element: ForecastElement;
}> = [
  { value: "weather", label: "天气", element: "ww" },
  { value: "temp", label: "气温", element: "tem" },
  { value: "rain", label: "降水", element: "pre" },
  { value: "wind", label: "极大风速", element: "windEx" },
];

// 实况查询方式对应要素集：小时查询 / 时段查询
// element 为接口要素编码，null 表示接口暂不支持（后端只提供 ww/pre/windEx/tem）
interface LiveFactorOption {
  value: string;
  label: string;
  element: "ww" | "pre" | "windEx" | "tem" | null;
  supported: boolean;
}

const liveFactorSets: Record<string, LiveFactorOption[]> = {
  hourly: [
    { value: "weather", label: "天气现象", element: "ww", supported: true },
    { value: "hourlyRain", label: "小时降水", element: "pre", supported: true },
    { value: "maxWind", label: "极大风", element: "windEx", supported: true },
    { value: "avgTemp", label: "平均气温", element: "tem", supported: true },
  ],
  period: [
    { value: "weather", label: "天气现象", element: "ww", supported: true },
    { value: "totalRain", label: "累计降水", element: "pre", supported: true },
    { value: "maxWind", label: "极大风", element: "windEx", supported: true },
    { value: "avgTemp", label: "平均气温", element: "tem", supported: true },
    { value: "maxTemp", label: "最高气温", element: null, supported: false },
    { value: "minTemp", label: "最低气温", element: null, supported: false },
  ],
};

// 区县选项 -> 接口 countyCode；市本级不传，返回全市所有城镇
const districtOptions = [
  { label: "市本级", value: "city", countyCode: "" },
  { label: "吴兴区", value: "wuxing", countyCode: "330502000000" },
  { label: "长兴县", value: "changxing", countyCode: "330522000000" },
  { label: "德清县", value: "deqing", countyCode: "330521000000" },
  { label: "安吉县", value: "anji", countyCode: "330523000000" },
  { label: "南浔区", value: "nanxun", countyCode: "330503000000" },
];

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

// 切换查询方式时，要素选择重置为新方式中接口支持的要素
function handleLiveModeChange(mode: string) {
  const set = liveFactorSets[mode];
  if (set) {
    liveForm.factors = set.filter((f) => f.supported).map((f) => f.value);
  }
  // HOUR 与 RANGE 行结构不同，已查过结果时按新口径重新取数，列表保持可见
  if (queried.value && liveForm.enabled) {
    void handleLiveQuery();
  }
}

/** 当前区县对应的接口 countyCode，市本级返回空串（不传该参数） */
const currentCountyCode = computed(
  () =>
    districtOptions.find((item) => item.value === topForm.district)?.countyCode ??
    "",
);

/** 要素勾选 -> 接口 elements 参数，按接口固定顺序拼接 */
function buildElementsParam(): string {
  const selected = new Set(
    liveFactorOptions.value
      .filter((f) => f.supported && liveForm.factors.includes(f.value))
      .map((f) => f.element as string),
  );
  return ["ww", "pre", "windEx", "tem"].filter((key) => selected.has(key)).join(",");
}

/** 实况列显隐：跟随要素勾选 */
const liveColumnVisible = computed(() => {
  const selected = buildElementsParam().split(",");
  return {
    weather: selected.includes("ww"),
    temp: selected.includes("tem"),
    rain: selected.includes("pre"),
    wind: selected.includes("windEx"),
  };
});

/** 降水列标题随查询方式变化：小时降水 / 累计降水量 */
const rainColumnLabel = computed(() =>
  liveForm.queryMode === "hourly" ? "小时降水(mm)" : "累计降水量(mm)",
);

/** 预报要素勾选 -> 接口 elements 参数，按接口固定顺序拼接 */
function buildForecastElementsParam(): string {
  const selected = new Set<ForecastElement>(
    factorOptions
      .filter((f) => forecastForm.factors.includes(f.value))
      .map((f) => f.element),
  );
  const order: ForecastElement[] = ["ww", "pre", "windEx", "tem"];
  return order.filter((key) => selected.has(key)).join(",");
}

/** 预报列显隐：跟随要素勾选 */
const forecastColumnVisible = computed(() => {
  const selected = buildForecastElementsParam().split(",");
  return {
    weather: selected.includes("ww"),
    temp: selected.includes("tem"),
    rain: selected.includes("pre"),
    wind: selected.includes("windEx"),
  };
});

/** 表格空态文案：未查询过 vs 查过但无数据 */
const queried = ref(false);
const liveEmptyText = computed(() =>
  queried.value ? "该条件下暂无数据" : "请选择条件后查询",
);

/** 预报表空态：接口接入前固定提示，接入后可沿用「已查/未查」判断 */
const forecastQueried = ref(false);
const forecastEmptyText = computed(() =>
  forecastQueried.value ? "该条件下暂无数据" : "请选择条件后查询",
);

/** 预报表时间列：接口按单个起报时次返回，只有出现多个时次时才展示该列 */
const showForecastTimeColumn = computed(
  () => new Set(forecastRows.value.map((row) => row.time)).size > 1,
);

const forecastForm = reactive({
  enabled: true,
  // 起报时间：日期 + 时次（仅 08:00:00 / 20:00:00，由 picker 限制）
  startTime: defaultForecastStartTime(),
  hourSelect: "hour24",
  factors: ["weather", "temp", "rain", "wind"] as string[],
});

const liveLoading = ref(false);
const forecastLoading = ref(false);

/** 查询结果行：实况表与预报表各自独立使用 */
interface QueryRow {
  district: string;
  street: string;
  time: string;
  weather: string;
  temp: string;
  rain: string;
  wind: string;
}

/** 实况数据表 */
const liveRows = ref<QueryRow[]>([]);
/** 预报数据表（接口待接入，先占位） */
const forecastRows = ref<QueryRow[]>([]);

/** 小时查询才展示“时间”列 */
const showTimeColumn = computed(() => liveForm.queryMode === "hourly");

/** 表头时间文案跟随表单，避免写死日期 */
const liveRangeLabel = computed(() => {
  if (!liveForm.timeStart || !liveForm.timeEnd) return "实况数据";
  return `${liveForm.timeStart}~${liveForm.timeEnd}`;
});

const forecastRangeLabel = computed(() => {
  if (!forecastForm.startTime) return "预报数据";
  const hours = forecastForm.hourSelect === "hour24" ? 24 : 12;
  return `${forecastForm.startTime}起报${hours}小时预报数据`;
});

function toText(value: unknown): string {
  return value === null || value === undefined || value === ""
    ? "-"
    : String(value);
}

function toNumberText(value: unknown, digits = 1): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(digits) : "-";
}

/** 接口按区县返回，这里再按区县+城镇排序，保证区县列能连续合并 */
function sortByCounty(list: TownWeatherItem[]): TownWeatherItem[] {
  return [...list].sort(
    (a, b) =>
      String(a.countyCode).localeCompare(String(b.countyCode)) ||
      String(a.townCode).localeCompare(String(b.townCode)),
  );
}

/**
 * 城镇天气列式响应 -> 实况表格行。
 * HOUR 展开到每个时次（带时间列），RANGE 取后端聚合值（每城镇一行）。
 */
function mapTownWeatherRows(
  list: TownWeatherItem[],
  queryType: TownWeatherQueryType,
): QueryRow[] {
  const rows: QueryRow[] = [];
  sortByCounty(list).forEach((item) => {
    const times = Array.isArray(item.times) ? item.times : [];
    if (queryType === "RANGE") {
      rows.push(buildRow(item, 0, ""));
      return;
    }
    times.forEach((time, index) => {
      rows.push(buildRow(item, index, dayjs(time).format("MM-DD HH:mm")));
    });
  });
  return rows;
}

function buildRow(
  item: TownWeatherItem,
  index: number,
  time: string,
): QueryRow {
  return {
    district: item.countyName ?? "",
    street: item.townName ?? "",
    time,
    weather: toText(item.ww?.[index]),
    temp: toNumberText(item.tem?.[index]),
    rain: toNumberText(item.pre?.[index]),
    wind: toNumberText(item.windEx?.[index]),
  };
}

/**
 * 城镇天气预报响应 -> 预报表行。
 * 接口每个城镇只返回 1 个值（times 只有一个起报时次），因此一城镇一行。
 */
function mapForecastRows(list: TownWeatherItem[]): QueryRow[] {
  return sortByCounty(list).map((item) => {
    const time = Array.isArray(item.times) && item.times[0]
      ? dayjs(item.times[0]).format("MM-DD HH:mm")
      : "";
    return buildRow(item, 0, time);
  });
}

// 区县 / 街道两级合并：连续且同组的行合并单元格
// 两张表各自独立，所以用工厂函数按各自的数据源生成 span-method
function createMergeSpan(getRows: () => QueryRow[]) {
  return ({
    row,
    column,
    rowIndex,
  }: {
    row: QueryRow;
    column: { property: string };
    rowIndex: number;
  }) => {
    const prop = column.property;
    if (prop !== "district" && prop !== "street") return;

    const data = getRows();
    // 街道要按「区县 + 街道」判断，避免不同区县同名街道被误合并
    const isSameGroup = (a: QueryRow, b: QueryRow) =>
      prop === "district"
        ? a.district === b.district
        : a.district === b.district && a.street === b.street;

    if (rowIndex === 0 || !isSameGroup(data[rowIndex - 1], row)) {
      let span = 1;
      for (let i = rowIndex + 1; i < data.length; i++) {
        if (isSameGroup(data[i], row)) span++;
        else break;
      }
      return { rowspan: span, colspan: 1 };
    }
    // 非首行 → 隐藏
    return { rowspan: 0, colspan: 0 };
  };
}

const mergeLiveRows = createMergeSpan(() => liveRows.value);
const mergeForecastRows = createMergeSpan(() => forecastRows.value);

async function handleLiveQuery() {
  if (!liveForm.enabled) {
    ElMessage.warning("请先勾选实况查询");
    return;
  }
  if (!liveForm.timeStart || !liveForm.timeEnd) {
    ElMessage.warning("请选择时间范围");
    return;
  }
  liveLoading.value = true;
  // 接口只接受整点时间
  const startTime = dayjs(liveForm.timeStart).startOf("hour").format("YYYYMMDDHHmmss");
  const endTime = dayjs(liveForm.timeEnd).startOf("hour").format("YYYYMMDDHHmmss");
  const queryType: TownWeatherQueryType =
    liveForm.queryMode === "hourly" ? "HOUR" : "RANGE";
  const elements = buildElementsParam();
  if (!elements) {
    liveLoading.value = false;
    ElMessage.warning("请至少选择一个要素");
    return;
  }
  const params = {
    queryType,
    startTime,
    endTime,
    elements,
    ...(currentCountyCode.value ? { countyCode: currentCountyCode.value } : {}),
  };
  try {
    const res = await getHzElectriCityStationTownWeather(params);
    console.log("[城镇天气] 实况查询参数", params);
    console.log("[城镇天气] 实况查询响应", res);
    liveRows.value = mapTownWeatherRows(res.DS ?? [], queryType);
    queried.value = true;
    if (!liveRows.value.length) {
      ElMessage.info(
        currentCountyCode.value ? "该区县暂无数据" : "该条件下暂无数据",
      );
    } else {
      ElMessage.success(`查询完成，共 ${liveRows.value.length} 条`);
    }
  } catch (error) {
    console.error("[城镇天气] 实况查询失败", error);
    liveRows.value = [];
    ElMessage.error("实况查询失败");
  } finally {
    liveLoading.value = false;
  }
}

async function handleForecastQuery() {
  if (!forecastForm.enabled) {
    ElMessage.warning("请先勾选预报查询");
    return;
  }
  if (!forecastForm.startTime) {
    ElMessage.warning("请选择起报时间");
    return;
  }
  const elements = buildForecastElementsParam();
  if (!elements) {
    ElMessage.warning("请至少选择一个要素");
    return;
  }

  forecastLoading.value = true;
  const params = {
    ptime: dayjs(forecastForm.startTime).format("YYYYMMDDHHmmss"),
    validTime: forecastForm.hourSelect === "hour24" ? "24" : "12",
    elements,
    ...(currentCountyCode.value ? { countyCode: currentCountyCode.value } : {}),
  };
  try {
    const res = await getHzElectriCityForecastTownWeather(params);
    console.log("[城镇天气] 预报查询参数", params);
    console.log("[城镇天气] 预报查询响应", res);
    forecastRows.value = mapForecastRows(res.DS ?? []);
    forecastQueried.value = true;
    if (!forecastRows.value.length) {
      ElMessage.info(
        currentCountyCode.value ? "该区县暂无预报数据" : "该条件下暂无预报数据",
      );
    } else {
      ElMessage.success(`预报查询完成，共 ${forecastRows.value.length} 条`);
    }
  } catch (error) {
    console.error("[城镇天气] 预报查询失败", error);
    forecastRows.value = [];
    ElMessage.error("预报查询失败");
  } finally {
    forecastLoading.value = false;
  }
}

function handleDownload() {
  ElMessage.success("开始下载查询结果（当前为示例）");
}

function handleClear() {
  liveForm.timeStart = "";
  liveForm.timeEnd = "";
  forecastForm.startTime = "";
  liveRows.value = [];
  forecastRows.value = [];
  queried.value = false;
  forecastQueried.value = false;
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
  /* 小屏时整页可滚动，避免查询结果被挤压到不可读 */
  overflow-y: auto;
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
  flex: 1 1 auto;
  /* 多级表头占位较高，给小屏留出可见行数，否则 body 会被压成 0 */
  min-height: clamp(16rem, 36vh, 30rem);
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

/* 实况 / 预报 两张独立表并排 */
.result-grid {
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(0.6rem, 1vw, 1rem);
  min-height: 0;
}

.result-table-block {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
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

  // 合并后的区县/街道单元格可能跨越上百行，默认垂直居中会让文字跑到可视区外；
  // 这里改为顶部对齐并让文字在列内吸顶，滚动时始终可见
  :deep(.el-table__body-wrapper td.el-table__cell[rowspan]:not([rowspan="1"])) {
    vertical-align: top;
  }

  :deep(.el-table__body-wrapper td.el-table__cell[rowspan]:not([rowspan="1"]) .cell) {
    position: sticky;
    top: 0;
    padding-top: 0.6rem;
    padding-bottom: 0.6rem;
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

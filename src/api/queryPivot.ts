import { get, post, download } from "./request";
/** 按时间段、产品类型查询数据列表 */
interface ForecastDataParams {
  prodCode: string; //昨日评估（Act实况，Fore预报，Assess要素评估，Model-Select推优结果）, forecast 今日预报，forecast_zip（今日zip），result_zip（昨日zip）
  startTime?: string;
  endTime?: string;
  limitCnt?: number;
  dataFormat?: string;
}
export function getForecastData(params: ForecastDataParams) {
  return get("/SJFW20260908103651/getSJPGProdCodeByTimeRange", params);
}
/** 按文件路径返回数据模式评估 */
interface GetSJPGMoShiFileParams {
  filePath: string; //文件路径
}
export function getSJPGMoShiFile(params: GetSJPGMoShiFileParams) {
  return get("/SJFW20260908103651/getSJPGMoShiFile", params);
}
/** 按文件路径下载模式评估文件（zip 等） */
export function downloadSJPGMoShiFile(params: GetSJPGMoShiFileParams) {
  return download("/SJFW20260908103651/getSJPGMoShiFile", params);
}

/** 城镇天气查询方式：HOUR 按小时输出，RANGE 按时间范围聚合 */
export type TownWeatherQueryType = "HOUR" | "RANGE";

/** 城镇天气可查询要素：ww 天气现象 / pre 降水 / windEx 极大风 / tem 气温 */
export type TownWeatherElement = "ww" | "pre" | "windEx" | "tem";

/** 湖州电力-城镇天气数据 查询参数 */
export interface TownWeatherParams {
  /** 区县编码，非必填，不传则查询全部城镇，如 330502000000 */
  countyCode?: string;
  /** 查询类型 */
  queryType: TownWeatherQueryType;
  /** 起始时间，yyyyMMddHHmmss，需为整点 */
  startTime: string;
  /** 结束时间，yyyyMMddHHmmss，需为整点 */
  endTime: string;
  /** 要素列表，逗号分隔，如 "ww,pre,windEx,tem"；不传则输出全部要素 */
  elements?: string;
}

/**
 * 城镇天气返回单条记录。
 * 每个城镇一条，times 与各要素数组等长同序（列式结构）。
 */
export interface TownWeatherItem {
  countyCode: string;
  countyName: string;
  townCode: string;
  townName: string;
  times: string[];
  ww?: Array<string | number | null>;
  pre?: Array<number | null>;
  windEx?: Array<number | null>;
  tem?: Array<number | null>;
  [key: string]: unknown;
}

/** 湖州电力-城镇天气数据：按小时 / 按范围查询城镇天气实况 */
export function getHzElectriCityStationTownWeather(params: TownWeatherParams) {
  return get<TownWeatherItem[]>(
    "/SJFW20261020110628/getHzElectriCityStationTownWeather",
    params,
  );
}

/** 湖州电力-城镇天气预报数据 查询参数 */
export interface TownForecastParams {
  /** 区县编码，非必填，不传则查询全部城镇，如 330502000000 */
  countyCode?: string;
  /** 起报时间，yyyyMMddHHmmss */
  ptime: string;
  /** 预报时效（小时），如 "12" / "24" */
  validTime: string;
  /** 要素列表，逗号分隔，如 "ww,pre,windEx,tem" */
  elements?: string;
}

/**
 * 湖州电力-城镇天气预报数据：按起报时间 + 时效查询。
 * 返回结构与实况一致，但 times 只有一个元素（即起报时次）。
 */
export function getHzElectriCityForecastTownWeather(params: TownForecastParams) {
  return get<TownWeatherItem[]>(
    "/SJFW20261020110628/getHzElectriCityForecastTownWeather",
    params,
  );
}

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

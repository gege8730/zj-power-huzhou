import { get, post } from './index'
/** 获取要素时间轴 */
export function getTimeList(params: { ncType: string; ele: string; startTime:string; endTime:string;}) {
    return post('/api/listDataByTimeRange', params)
}
/** 获取要素文件内容 */
export function getDataFile(params: { filePath: string; region: string;}) {
    return get('/api/getDataFile', params)
}
/**获取相似日 */
export function hzSmailDay(params: { type: string;}) {
    return get('/api/hzSmailDay', params)
}
/**获取短期预报 */
export function getDqByHz() {
    return get('/api/getDqByHz')
}
/**获取15天预报 */
export function dayForecast(params: { lat: string;lon: string;}) {
    return get('/api/dayForecast', params)
}
/**获取雷达 */
export function radarList(params: { begintime: string;endtime: string;}) {
    return get('/api/radarList', params)
}
/**获取当前气象预警 */
export function getWarn(params: { area: string;}) {
    return get('/api/warningNow', params)
}
/**获取色标配置 */
export function seBiaoByCategory(params: { category: string;}) {
    return get('/api/seBiaoByCategory', params)
}
/**获取短临告警 */
export function getShortTermWarning(params: { time: string; adminCode: string; }) {
    return post('/api/strongconv/townShortWarning', params)
}
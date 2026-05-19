import { get, post } from './index'
/** 获取要素时间轴 */
export function getTimeList(params: { ncType: string; ele: string; startTime:string; endTime:string;}) {
    return post('/api/listDataByTimeRange', params)
}
/** 获取要素空间分布 */
export function getDataFile(params: { filePath: string; region: string;}) {
    return get('/api/getDataFile', params)
}
import { download, get } from './request'

/** 调试：统一打印 SCMOC 接口的请求参数与返回结果 */
function logScmocResponse(name: string, params: object, result: unknown) {
  console.groupCollapsed(`[SCMOC接口返回] ${name}`)
  console.log('请求参数:', params)
  console.log('返回结果:', result)
  console.groupEnd()
}

export interface ScmocGridFile {
  filePath: string
  level: number
  prodCode: string
  ptime: string
  validTime: number
}

export interface ScmocGridData {
  startLon: number
  startLat: number
  endLon: number
  endLat: number
  lonStep: number
  latStep: number
  lonLength: number
  latLength: number
  values: number[]
}

export interface ScmocGridExtent {
  startLon: number
  startLat: number
  endLon: number
  endLat: number
}

interface ScmocGridFileListParams {
  prodCode: string
  startTime?: string
  endTime?: string
  limitCnt: number
  dataType: 'png'
  dataFormat: 'json'
}

export async function getScmocGridFileList(params: ScmocGridFileListParams) {
  const response = await get<ScmocGridFile[]>(
    '/SJFW20261027105726/getNafpNwfdScmocOfGridEleTimeListByTimeRange',
    params,
  )
  logScmocResponse('1 文件列表 getNafpNwfdScmocOfGridEleTimeListByTimeRange', params, response)
  return response
}

export async function downloadScmocGridFile(params: Pick<ScmocGridFile, 'ptime' | 'filePath'>) {
  const blob = await download(
    '/SJFW20261027105726/getNafpNwfdScmocOfGetFile',
    params,
  )
  logScmocResponse('2 取PNG getNafpNwfdScmocOfGetFile', params, {
    type: blob.type,
    size: blob.size,
    blob,
  })
  return blob
}

export async function getScmocGridData(
  params: Pick<ScmocGridFile, 'prodCode' | 'ptime'> & ScmocGridExtent,
) {
  const requestParams = { ...params, dataFormat: 'json' }
  const response = await get<ScmocGridData[]>(
    '/SJFW20261027105726/getNafpNwfdScmocOfGridDataByProdCodeAndTime',
    requestParams,
  )
  logScmocResponse('3 原始格点 getNafpNwfdScmocOfGridDataByProdCodeAndTime', requestParams, response)
  return response
}

import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

/** 后端响应通用结构 */
export interface ApiResponse<T = any> {
  returnCode: string
  DS: T
  returnMessage: string
}

/** 自定义请求配置扩展 */
interface RequestConfig extends AxiosRequestConfig {
  /** 是否跳过全局错误提示，默认 false */
  skipErrorHandler?: boolean
}

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API || '', // 基础 URL，根据环境变量配置
  timeout: 15000,
})

// ──────── 请求拦截器 ────────
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ──────── 响应拦截器 ────────
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { returnCode, returnMessage } = response.data

    // 业务状态码判断（根据实际后端约定调整）
    if ( returnCode === '0') {
      return response.data as any
    }

    // 登录过期
    if (returnCode === '401') {
      localStorage.removeItem('token')
      ElMessage.error('登录已过期，请重新登录')
      // 可在此处跳转登录页：window.location.href = '/login'
      return Promise.reject(new Error(returnMessage || '未授权'))
    }

    ElMessage.error(returnMessage || '请求失败')
    return Promise.reject(new Error(returnMessage || '请求失败'))
  },
  (error) => {
    const msg = error.response?.data?.returnMessage || error.returnMessage || '网络异常'
    ElMessage.error(msg)
    return Promise.reject(error)
  },
)

// ──────── 通用请求方法 ────────
function request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
  return service(config) as unknown as Promise<ApiResponse<T>>
}

/** GET 请求 */
export function get<T = any>(url: string, params?: object, config?: RequestConfig): Promise<ApiResponse<T>> {
  return request<T>({ method: 'GET', url, params, ...config })
}

/** POST 请求 */
export function post<T = any>(url: string, data?: object, config?: RequestConfig): Promise<ApiResponse<T>> {
  return request<T>({ method: 'POST', url, data, ...config })
}

/** PUT 请求 */
export function put<T = any>(url: string, data?: object, config?: RequestConfig): Promise<ApiResponse<T>> {
  return request<T>({ method: 'PUT', url, data, ...config })
}

/** DELETE 请求 */
export function del<T = any>(url: string, params?: object, config?: RequestConfig): Promise<ApiResponse<T>> {
  return request<T>({ method: 'DELETE', url, params, ...config })
}

export default request

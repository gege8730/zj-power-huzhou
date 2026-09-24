import axios from "axios";
import type {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { ElMessage } from "element-plus";

/** 后端响应通用结构 */
export interface ApiResponse<T = any> {
  returnCode: string;
  DS: T;
  returnMessage: string;
}

/** 自定义请求配置扩展 */
interface RequestConfig extends AxiosRequestConfig {
  /** 是否跳过全局错误提示，默认 false */
  skipErrorHandler?: boolean;
}
const appKey = import.meta.env.VITE_APP_KEY;
const appSecret = import.meta.env.VITE_APP_SECRET;
function nonce() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 32);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
async function buildSignedRequest(params: any, sortedBody: any) {
  if (!appKey || !appSecret) throw new Error("未配置业务接口签名参数");
  const timestamp = Date.now().toString();
  const nonceValue = nonce();
  const paramsText = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const bodyRecord = asRecord(sortedBody);
  const bodyText = Object.keys(bodyRecord).length
    ? JSON.stringify(sortedBody)
    : "";
  const headerText = `appKey=${appKey}&nonce=${nonceValue}&timestamp=${timestamp}`;
  const sign = await sha256(paramsText + bodyText + headerText + appSecret);
  return {
    appKey,
    timestamp,
    nonce: nonceValue,
    sign,
  };
}
const service: AxiosInstance = axios.create({
  baseURL: "https://szpt.zj121.com/sph-main/zjcloud-gw",
  timeout: 15000,
});

// ──────── 请求拦截器 ────────
service.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const method = config.method?.toUpperCase() || "GET";
    const params = config.params || {};
    const body = method === "POST" ? config.data || {} : {};

    // 异步计算签名头
    const signedHeaders = await buildSignedRequest(params, body);

    // 合并到请求头
    config.headers = {
      ...config.headers,
      ...signedHeaders,
    };
    return config;
  },
  (error) => Promise.reject(error),
);

// ──────── 响应拦截器 ────────
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // 二进制下载（blob）直接返回原始数据，不按业务 JSON 解析
    if (response.config.responseType === "blob" || response.data instanceof Blob) {
      return response.data as any;
    }

    const { returnCode, returnMessage } = response.data;

    // 业务状态码判断（根据实际后端约定调整）
    if (returnCode === "0") {
      return response.data as any;
    }

    // 登录过期
    if (returnCode === "401") {
      localStorage.removeItem("token");
      ElMessage.error("登录已过期，请重新登录");
      // 可在此处跳转登录页：window.location.href = '/login'
      return Promise.reject(new Error(returnMessage || "未授权"));
    }

    ElMessage.error(returnMessage || "请求失败");
    return Promise.reject(new Error(returnMessage || "请求失败"));
  },
  (error) => {
    const msg =
      error.response?.data?.returnMessage || error.returnMessage || "网络异常";
    ElMessage.error(msg);
    return Promise.reject(error);
  },
);

// ──────── 通用请求方法 ────────
function request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
  return service(config) as unknown as Promise<ApiResponse<T>>;
}

/** GET 请求 */
export function get<T = any>(
  url: string,
  params?: object,
  config?: RequestConfig,
): Promise<ApiResponse<T>> {
  return request<T>({ method: "GET", url, params, ...config });
}

/** POST 请求 */
export function post<T = any>(
  url: string,
  data?: object,
  config?: RequestConfig,
): Promise<ApiResponse<T>> {
  return request<T>({ method: "POST", url, data, ...config });
}

/** PUT 请求 */
export function put<T = any>(
  url: string,
  data?: object,
  config?: RequestConfig,
): Promise<ApiResponse<T>> {
  return request<T>({ method: "PUT", url, data, ...config });
}

/** DELETE 请求 */
export function del<T = any>(
  url: string,
  params?: object,
  config?: RequestConfig,
): Promise<ApiResponse<T>> {
  return request<T>({ method: "DELETE", url, params, ...config });
}

/** 下载文件（返回二进制 Blob） */
export function download(
  url: string,
  params?: object,
  config?: RequestConfig,
): Promise<Blob> {
  return service({
    method: "GET",
    url,
    params,
    responseType: "blob",
    ...config,
  }) as unknown as Promise<Blob>;
}

export default request;

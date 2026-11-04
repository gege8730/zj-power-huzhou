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

/**
 * 接口签名。
 * 注意：crypto.randomUUID / crypto.subtle 只在安全上下文（HTTPS 或 localhost）可用，
 * 用局域网 IP 走 http 打开页面时它们是 undefined，这里必须自带兜底实现。
 */
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotateRight = (value: number, bits: number) => (value >>> bits) | (value << (32 - bits));

/** 与 crypto.subtle 等价的纯 JS SHA-256（十六进制小写），不依赖安全上下文 */
function sha256(value: string): string {
  const source = new TextEncoder().encode(value);
  const totalLength = Math.ceil((source.length + 9) / 64) * 64;
  const buffer = new Uint8Array(totalLength);
  buffer.set(source);
  buffer[source.length] = 0x80;

  const view = new DataView(buffer.buffer);
  view.setUint32(totalLength - 8, Math.floor((source.length * 8) / 0x100000000));
  view.setUint32(totalLength - 4, (source.length * 8) >>> 0);

  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const words = new Uint32Array(64);

  for (let offset = 0; offset < totalLength; offset += 64) {
    for (let index = 0; index < 16; index++) {
      words[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index++) {
      const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }

    let a = hash[0], b = hash[1], c = hash[2], d = hash[3];
    let e = hash[4], f = hash[5], g = hash[6], h = hash[7];

    for (let index = 0; index < 64; index++) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + sum1 + choice + SHA256_K[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  return Array.from(hash, (item) => item.toString(16).padStart(8, "0")).join("");
}

function nonce() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID().replace(/-/g, "").slice(0, 32);
  }
  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index++) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (item) => item.toString(16).padStart(2, "0")).join("");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function buildSignedRequest(params: any, sortedBody: any) {
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
  const sign = sha256(paramsText + bodyText + headerText + appSecret);
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

    // 计算签名头（纯 JS 实现，不依赖安全上下文）
    const signedHeaders = buildSignedRequest(params, body);

    // 合并到请求头
    config.headers.set(signedHeaders);
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
    const code = String(returnCode);

    // 业务状态码判断（根据实际后端约定调整）
    if (code === "0") {
      return response.data as any;
    }

    // 登录过期
    if (code === "401") {
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

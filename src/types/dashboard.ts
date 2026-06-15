export interface WeatherFactorGroup {
  name: string
  options: string[]
}

export interface ForecastDay {
  week: string
  date: string
  weather: string
  icon: string
  high: number
  low: number
  wind: string
  level: string
}

export interface WarningCell {
  risk: '低风险' | '中风险' | '高风险'
}

export interface WarningHour {
  time: string  // 如 "16:00"
  risk: WarningCell['risk']
}

export interface WarningRow {
  town: string
  realtime: WarningCell
  hours: WarningHour[]  // 未来三个小时
}

export interface SimilarDay {
  date: string
  percent: number
  high: number
  low: number
  rain: number
}

export interface MaterialFile {
  title: string
  updateTime: string
  pdfUrl?: string
  filePath?: string
  category?: string
  type?: string
}

export interface LayerGroup {
  title: string
  switchable: boolean
  enabled: boolean
  items: Array<{ name: string; checked: boolean }>
}

export interface DashboardMock {
  time: string
  date: string
  week: string
  helpText: string
  title: string
  mapTitle: string
  mapSubtitle: string
  queryPlaceholder: string
  weatherFactors: WeatherFactorGroup[]
  forecastText: string
  forecastDays: any[]
  toolbar: string[]
  activeToolbar: string
  layerGroups: LayerGroup[]
  warning: WarningRow[]
  similarDays: SimilarDay[]
  materialTabs: string[]
  materialFiles: MaterialFile[]
  timeline: Array<{ dateTime: string; filePath: string }>
}

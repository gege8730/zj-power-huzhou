export interface WeatherFactorGroup {
  name: string
  options: string[]
  activeIndex: number
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

export interface WarningRow {
  town: string
  realtime: WarningCell
  h16: WarningCell
  h17: WarningCell
  h18: WarningCell
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
  forecastDays: ForecastDay[]
  toolbar: string[]
  activeToolbar: string
  layerGroups: LayerGroup[]
  warning: WarningRow[]
  similarDays: SimilarDay[]
  materialTabs: string[]
  materialFiles: MaterialFile[]
  timeline: string[]
}

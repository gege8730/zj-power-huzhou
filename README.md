# 湖州电力气象服务平台大屏还原

当前版本已从“外层 transform 等比缩放”调整为“响应式布局”，整体使用 `grid / flex / % / vw / vh / rem / clamp()` 管理页面尺寸。

## 技术栈

- Vite
- Vue 3 + `<script setup>`
- TypeScript
- 纯 CSS/SVG 还原面板、表格、图表、时间轴等效果

## 目录结构

```txt
src/
├── views/
│   └── DashboardView.vue            # 页面级组件，承接整体布局和数据装配
├── assets/
│   ├── huzhou-map-placeholder.png   # 从设计稿/PSD合成图中切出的中心地图占位图
│   ├── header-reference.png         # 顶部设计参考切图
│   └── design-reference.jpg         # 原设计稿参考图
├── components/
│   ├── common/                      # 通用组件
│   │   ├── BasePanel.vue            # 通用面板
│   │   └── TopHeader.vue            # 顶部标题栏
│   ├── left/                        # 左侧区域组件
│   │   ├── LeftSidebar.vue          # 左侧容器
│   │   ├── WeatherFactorsPanel.vue  # 要素叠加
│   │   └── WeatherForecastPanel.vue # 天气预报/七天预报
│   ├── center/                      # 中间地图区域组件
│   │   ├── MapStage.vue             # 中间地图区域
│   │   ├── LayerToolbar.vue         # 地图左侧工具条
│   │   ├── MapControlGroup.vue      # 地图图层控制
│   │   ├── TemperatureLegend.vue    # 温度色标
│   │   └── TimeAxis.vue             # 底部时间轴
│   └── right/                       # 右侧区域组件
│       ├── RightSidebar.vue         # 右侧容器
│       ├── ShortWarningPanel.vue    # 短临告警
│       ├── SimilarDayPanel.vue      # 相似日
│       └── ImportantMaterialsPanel.vue # 重要材料
├── mock/
│   └── dashboard.json               # 页面全部 mock 数据
├── styles/
│   └── global.css                   # 全局样式、主题变量、响应式布局变量
└── types/
    └── dashboard.ts                 # 数据类型定义
```

## 启动

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

类型检查单独执行：

```bash
npm run type-check
```

浏览器访问 Vite 输出的地址即可。

## 响应式布局说明

1. `App.vue` 只负责挂载 `DashboardView`，页面结构尽量保持清爽。
2. `DashboardView.vue` 使用三列 Grid：左侧区域 / 中间地图区域 / 右侧区域。
3. 页面不再使用 `transform: scale(...)` 做整体缩放；核心布局尺寸由 `global.css` 中的 CSS 变量统一控制。
4. 全局字体基准使用 `clamp()` 跟随视口变化，组件内部宽高、间距尽量使用 `% / rem / vw / vh / clamp()`。
5. 少量 `1px` 边框和 SVG 图表坐标保留固定单位，用于保证细线和折线图显示稳定。

## 数据替换

当前页面数据统一来自：

```txt
src/mock/dashboard.json
```

后续接接口时，可以保持组件 props 不变，只需要在 `views/DashboardView.vue` 中把 mock 数据替换为接口返回数据，或者封装为 `services/dashboard.ts`。

## 地图替换

中间地图目前使用：

```txt
src/assets/huzhou-map-placeholder.png
```

后续接入 Leaflet、Mapbox、Cesium 或内部 GIS 组件时，只需要替换 `components/center/MapStage.vue` 中 `.map-canvas` 内部实现即可。

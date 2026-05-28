# OpenLayers 迁移说明

本版本已将项目里的地图运行时从 Leaflet 替换为 OpenLayers。

## 已替换内容

- `@zjqx/gridfield` 替换为 `zjqx-gridfield-0.2.3-openlayers-examples.tgz` 本地资源包。
- 移除项目依赖中的 `leaflet` 与 `@types/leaflet`。
- 新增 `ol` 依赖，并在 `src/main.ts` 中引入 `ol/ol.css`。
- `src/components/center/MapCore.vue` 使用 `ZJQXOpenLayersMap` 与 `ZJQXOpenLayersGridFieldLayer` 初始化地图和格点填色层。
- 天地图基础图层从 Leaflet tile pane 替换为 OpenLayers `XYZ + TileLayer`。
- 雷达图片从 Leaflet `imageOverlay` 替换为 OpenLayers `ImageStatic + ImageLayer`。
- 自动站、区县界、区县名、乡镇界、乡镇名从 Leaflet `marker / geoJSON / layerGroup` 替换为 OpenLayers `VectorLayer + VectorSource + Style`。

## 运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 注意

当前 OpenLayers 版格点层默认使用：

```ts
renderResolutionMode: 'integer-zoom',
interpolate: true,
ratio: 1.15,
```

它会在缩放过程中尽量复用 OpenLayers 的图像变换能力，避免 Leaflet 时代自定义 DOM/canvas 图层在缩放动画中出现漂移或暂停。

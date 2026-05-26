<template>
    <div class="map-container" ref="mapContainer">
        <div id="map"></div>
    </div>
</template>

<script setup lang="ts">
import 'leaflet/dist/leaflet.css';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import {
    ZJQXMap,
    ZJQXGridFieldLayer,
    normalizeWeatherGrid,
    createColorScale,
    createPaletteTextureData,
    DEFAULT_GRID_FIELD_BORDER_OPTIONS,
    DEFAULT_GRID_FIELD_FILL_OPTIONS,
    DEFAULT_GRID_FIELD_LABEL_OPTIONS,
} from '@zjqx/gridfield';
import type { ColorScaleJson, ZJQXGridFieldLayerOptions, ClipGeometryInput } from '@zjqx/gridfield';
import { useLayerToolbarStore, useMapControlGroupStore, useMapStore } from '@/store'

const store = useMapStore()
const layerToolbarStore = useLayerToolbarStore()
const mapControlStore = useMapControlGroupStore()

const mapContainer = ref<HTMLElement | null>(null);
let zjqxMap: ReturnType<typeof ZJQXMap.initMap> | null = null;

onMounted(async () => {
    try {
        // 初始化地图
        zjqxMap = ZJQXMap.initMap('map', {
            center: [30.7541, 119.786],
            zoom: 9.3,
            zoomSnap: 0.1,
            zoomDelta: 0.1,
            maxZoom: 15,
            minZoom: 8.5,
            wheelPxPerZoomLevel: 300,
            zoomControl: false, //禁用 + - 按钮
            doubleClickZoom: false, // 禁用双击放大
            attributionControl: false, // 移除右下角leaflet标识
            baseLayer: {
                url: `https://t5.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${import.meta.env.VITE_APP_TDT_TK}`,
                options: {
                    maxZoom: 18,
                },
            },
        });
        layerToolbarStore.setMap(zjqxMap as any);
        mapControlStore.setMap(zjqxMap as any);

        // 先加载 geojson
        const adminBoundary = await fetch('/sample/huz.geojson')
            .then((res) => {
                if (!res.ok) throw new Error(`Failed to load geojson: ${res.status}`);
                return res.json() as Promise<ClipGeometryInput>;
            });

        let layer: InstanceType<typeof ZJQXGridFieldLayer> | null = null;

        const getGridControlOptions = () => ({
            fill: {
                ...DEFAULT_GRID_FIELD_FILL_OPTIONS,
                enabled: mapControlStore.gridFillEnabled,
                fillType: 2,
                opacity: mapControlStore.gridFillEnabled ? 1 : 0,
            },
            border: {
                ...DEFAULT_GRID_FIELD_BORDER_OPTIONS,
                enabled: mapControlStore.gridFillEnabled,
                color: '#fff',
                width: 2,
            },
            labels: {
                ...DEFAULT_GRID_FIELD_LABEL_OPTIONS,
                enabled: mapControlStore.gridFillEnabled && mapControlStore.gridValueVisible,
                color: '#000',
                fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
                fontWeight: 500,
            },
        });

        /**
         * 能见度接口色标单位是 km，而格点数据值是 m。
         * 这里只为填色渲染换算阈值，store 中的原始色标和格点文本层都不做转换。
         */
        const getRenderColorStops = () => {
            const config = store.mapRenderData.colorConfig
            const stops = config?.stops || []
            const unit = String(config?.unit || '').trim().toLowerCase()
            const needVisibilityMeterScale = store.currentFactorType === 'visibility' && ['km', '公里', '千米'].includes(unit)

            if (!needVisibilityMeterScale) return stops

            return stops.map((item) => ({
                ...item,
                value: item.value * 1000,
            }))
        }

        const getColorScaleResources = () => {
            const config = store.mapRenderData.colorConfig
            if (!config?.stops?.length) return null

            const colorConfig: ColorScaleJson = {
                fieldName: config.fieldName,
                stops: getRenderColorStops(),
            }
            const colorize = createColorScale(colorConfig, { mode: 'step', stopKey: 'stops' });
            const palette = createPaletteTextureData(colorConfig, { mode: 'step', stopKey: 'stops' });
            return { colorConfig, colorize, palette }
        }

        const removeGridLayer = () => {
            if (layer && zjqxMap) {
                zjqxMap.removeZJQXLayer(layer);
                layer = null;
            }
        }

        const applyGridControlOptions = () => {
            if (!layer) return;
            try {
                layer.update(getGridControlOptions() as any);
            } catch (error) {
                console.warn('更新填色图层显隐失败:', error);
            }
        };

        const applyGridClip = () => {
            if (!layer) return;

            const gridLayer = layer as any;
            try {
                if (mapControlStore.mapClipEnabled) {
                    if (typeof gridLayer.setClipGeometry === 'function') {
                        gridLayer.setClipGeometry(adminBoundary);
                    }
                    if (typeof gridLayer.setClipEnabled === 'function') {
                        gridLayer.setClipEnabled(true);
                    } else if (typeof gridLayer.update === 'function') {
                        gridLayer.update({ clip: { geometry: adminBoundary, enabled: true } });
                    }
                    return;
                }

                if (typeof gridLayer.setClipEnabled === 'function') {
                    gridLayer.setClipEnabled(false);
                } else if (typeof gridLayer.clearClip === 'function') {
                    gridLayer.clearClip();
                } else if (typeof gridLayer.update === 'function') {
                    gridLayer.update({ clip: { enabled: false } });
                }
            } catch (error) {
                console.warn('更新地图裁剪状态失败:', error);
            }
        };

        const updateGridLayer = () => {
            const gridData = store.mapRenderData.gridData
            const colorResources = getColorScaleResources()
            if (!gridData || !zjqxMap || !colorResources) {
                removeGridLayer();
                return;
            }

            if (layer) {
                layer.update({
                    data: gridData,
                    normalize: { rowOrder: 'south-to-north' },
                    palette: colorResources.palette,
                    colorize: colorResources.colorize,
                })
                applyGridControlOptions();
                applyGridClip();
            } else {
                const grid = normalizeWeatherGrid(gridData, { rowOrder: 'south-to-north' });
                layer = new ZJQXGridFieldLayer({
                    data: grid,
                    palette: colorResources.palette,
                    colorize: colorResources.colorize,
                    clip: mapControlStore.mapClipEnabled ? { geometry: adminBoundary } : undefined,
                    ...getGridControlOptions(),
                    popup: false,
                } as ZJQXGridFieldLayerOptions);
                zjqxMap!.addZJQXLayer(layer);
                applyGridClip();
            }
        };

        watch(() => [store.mapRenderData.gridData, store.mapRenderData.colorConfig], () => {
            updateGridLayer();
        }, { immediate: true, deep: true });

        watch(() => [mapControlStore.gridFillEnabled, mapControlStore.gridValueVisible], () => {
            applyGridControlOptions();
        }, { immediate: true });

        watch(() => mapControlStore.mapClipEnabled, () => {
            applyGridClip();
        }, { immediate: true });

        watch(() => [
            store.timeline.currentLabel?.dateTime,
            store.timeline.currentLabel?.filePath,
            store.currentSelection,
            store.productMode,
            mapControlStore.autoStationEnabled,
        ], () => {
            mapControlStore.refreshStationLayerVisible();
            if (mapControlStore.autoStationEnabled) {
                mapControlStore.loadStationDataByCurrentTime();
            }
        }, { immediate: true });
    } catch (error) {
        console.error('Failed to initialize map:', error);
    }
});

// 组件卸载时清理地图实例，防止内存泄漏
onUnmounted(() => {
    layerToolbarStore.clearActiveLayer();
    layerToolbarStore.setMap(null);
    mapControlStore.removeAllControlLayers();
    mapControlStore.setMap(null);
    if (zjqxMap) {
        zjqxMap.remove();
        zjqxMap = null;
    }
});
</script>

<style>
.leaflet-tile-pane {
    filter: grayscale(100%) sepia(30%) invert(100%) saturate(270%);
    /* filter: grayscale(150%) contrast(10%) brightness(170%) sepia(.1) invert(.85) saturate(200%) !important; */
    /* filter: grayscale(150%) sepia(8%) invert(90%) saturate(100%) !important; */
    /* filter: brightness(0.2) contrast(1.28) saturate(0.42) hue-rotate(200deg) grayscale(0.42) !important; */
}

.map-control-station-name,
.map-control-station-value,
.map-control-county-name,
.map-control-town-name {
    width: max-content !important;
    height: auto !important;
    pointer-events: none;
    white-space: nowrap;
    text-shadow: 0 1px 5px rgba(0, 0, 0, 0.75), 0 0 6px rgba(0, 0, 0, 0.45);
}

.map-control-station-name {
    color: #e9fbff;
    font-size: 14px;
    font-weight: 500;
}

.map-control-station-value {
    color: #ffbb00;
    font-size: 14px;
    font-weight: 700;
}

.map-control-county-name {
    color: #f7fbff;
    font-size: 14px;
    font-weight: 700;
    text-align: center;
    letter-spacing: 0.08em;
}

.map-control-town-name {
    color: rgba(224, 247, 255, 0.88);
    font-size: 10px;
    font-weight: 500;
    text-align: center;
    letter-spacing: 0.03em;
}
</style>

<style lang="scss" scoped>
.map-container {
    width: 100%;
    height: 100%;

    #map {
        width: 100%;
        height: 100%;
    }
}
</style>

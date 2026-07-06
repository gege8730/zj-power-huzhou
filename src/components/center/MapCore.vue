<template>
    <div class="map-container" ref="mapContainer">
        <div id="map"></div>
    </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
import {
    ZJQXOpenLayersMap as ZJQXMap,
    ZJQXOpenLayersGridFieldLayer as ZJQXGridFieldLayer,
    normalizeWeatherGrid,
    createColorScale,
    createPaletteTextureData,
    DEFAULT_GRID_FIELD_BORDER_OPTIONS,
    DEFAULT_GRID_FIELD_FILL_OPTIONS,
    DEFAULT_GRID_FIELD_LABEL_OPTIONS,
} from '@zjqx/gridfield';
import type { ColorScaleJson, ZJQXOpenLayersGridFieldLayerOptions, ClipGeometryInput } from '@zjqx/gridfield';
import { useLayerToolbarStore, useLayoutStore, useMapControlGroupStore, useMapStore } from '@/store'

const store = useMapStore()
const layerToolbarStore = useLayerToolbarStore()
const mapControlStore = useMapControlGroupStore()
const layoutStore = useLayoutStore()

const mapContainer = ref<HTMLElement | null>(null);
let zjqxMap: InstanceType<typeof ZJQXMap> | null = null;
let resizeObserver: ResizeObserver | null = null;

const INITIAL_MAP_CENTER: [number, number] = [30.7541, 119.786];
const NORMAL_MAP_ZOOM = 9.3;
const FULLSCREEN_MAP_ZOOM = 10;
const MAP_ZOOM_ANIMATION_DURATION = 260;
const LAYOUT_TRANSITION_DURATION = 460;
const TOWN_BOUNDARY_URL = `${import.meta.env.VITE_APP_BASE_URL}/sample/town_bounder.geojson`;
const geoJsonFormat = new GeoJSON();
const CONVECTION_RISK_COLORS = ['#52cf93', '#ffda5a', '#f14b57'] as const;

type ConvectionVectorLayer = VectorLayer<VectorSource<Feature>>;

const convectionTownStyleCache = new Map<number, Style>();

const getConvectionTownStyle = (feature: any) => {
    const riskLevel = Math.max(0, Math.min(2, Number(feature.get('riskLevel')) || 0));
    const cached = convectionTownStyleCache.get(riskLevel);
    if (cached) return cached;

    const style = new Style({
        fill: new Fill({ color: CONVECTION_RISK_COLORS[riskLevel] }),
        stroke: new Stroke({ color: 'rgba(255, 255, 255, 0.92)', width: 1 }),
    });
    convectionTownStyleCache.set(riskLevel, style);
    return style;
};

const convectionOutlineStyle = new Style({
    stroke: new Stroke({ color: '#ffffff', width: 2.8 }),
});

const normalizeConvectionKey = (value: unknown) => String(value ?? '').trim();

const getConvectionFeatureKeys = (feature: any) => {
    const properties = feature.getProperties();
    return [
        properties.NAME,
        properties.TOWN,
        properties.name,
        properties.town,
        properties.adcode,
        properties.adminCode,
        properties.GNID,
        properties.code,
    ].map(normalizeConvectionKey).filter(Boolean);
};

const closeRing = (ring: number[][]) => {
    if (!Array.isArray(ring) || ring.length < 3) return null;
    const closedRing = ring.map((point) => [...point]);
    const first = closedRing[0];
    const last = closedRing[closedRing.length - 1];
    if (first?.[0] !== last?.[0] || first?.[1] !== last?.[1]) {
        closedRing.push([...first]);
    }
    return closedRing.length >= 4 ? closedRing : null;
};

const convertBoundaryLinesToPolygons = (geojson: any) => ({
    ...geojson,
    features: Array.isArray(geojson?.features)
        ? geojson.features.map((feature: any) => ({
            ...feature,
            geometry: convertLineGeometryToPolygon(feature?.geometry),
        }))
        : [],
});

const convertLineGeometryToPolygon = (geometry: any) => {
    if (!geometry) return geometry;
    if (geometry.type === 'LineString') {
        const ring = closeRing(geometry.coordinates);
        return ring ? { type: 'Polygon', coordinates: [ring] } : geometry;
    }
    if (geometry.type === 'MultiLineString') {
        const polygons = (geometry.coordinates || [])
            .map(closeRing)
            .filter(Boolean)
            .map((ring: number[][]) => [ring]);
        if (polygons.length === 1) return { type: 'Polygon', coordinates: polygons[0] };
        if (polygons.length > 1) return { type: 'MultiPolygon', coordinates: polygons };
    }
    return geometry;
};

const getOpenLayersMap = () => {
    const map = zjqxMap as any
    if (!map) return null

    const rawMap = map.getRawMap?.() || map.getOpenLayersMap?.() || map.map || map._map
    if (rawMap && typeof rawMap.updateSize === 'function') return rawMap
    if (typeof map.updateSize === 'function') return map
    return null
}

const updateMapSize = () => {
    const map = getOpenLayersMap()
    map?.updateSize?.()
}

const updateMapSizeDuringLayoutTransition = () => {
    nextTick(() => {
        updateMapSize()
        window.setTimeout(updateMapSize, 80)
        window.setTimeout(updateMapSize, LAYOUT_TRANSITION_DURATION)
    })
}

const getOpenLayersView = () => {
    const map = getOpenLayersMap() as any
    return map?.getView?.() || null
}

const setMapZoom = (zoom: number, animate = true) => {
    const view = getOpenLayersView() as any
    if (!view) return

    const center = fromLonLat([INITIAL_MAP_CENTER[1], INITIAL_MAP_CENTER[0]])

    if (animate && typeof view.animate === 'function') {
        view.animate({
            center,
            zoom,
            duration: MAP_ZOOM_ANIMATION_DURATION,
        })
        return
    }

    if (typeof view.setCenter === 'function') {
        view.setCenter(center)
    }
    if (typeof view.setZoom === 'function') {
        view.setZoom(zoom)
    }
}

const applyFullscreenZoom = (isFullscreen: boolean) => {
    const targetZoom = isFullscreen ? FULLSCREEN_MAP_ZOOM : NORMAL_MAP_ZOOM

    nextTick(() => {
        updateMapSize()
        setMapZoom(targetZoom)
        window.setTimeout(() => {
            updateMapSize()
            setMapZoom(targetZoom, false)
        }, LAYOUT_TRANSITION_DURATION)
    })
}

onMounted(async () => {
    try {
        // 初始化地图
        zjqxMap = ZJQXMap.initMap('map', {
            center: INITIAL_MAP_CENTER,
            zoom: NORMAL_MAP_ZOOM,
            maxZoom: 15.5,
            minZoom: 7.5,
            controls: false,
            baseLayer: {
                url: `https://t5.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${import.meta.env.VITE_APP_TDT_TK}`,
                sourceOptions: {
                    crossOrigin: 'anonymous',
                    maxZoom: 18,
                    transition: 0,
                    wrapX: true,
                },
                layerOptions: {
                    className: 'zjqx-base-tile-layer',
                    zIndex: 0,
                    preload: 3,
                },
            },
        });
        layerToolbarStore.setMap(zjqxMap as any);
        mapControlStore.setMap(zjqxMap as any);

        if (mapContainer.value) {
            resizeObserver = new ResizeObserver(updateMapSizeDuringLayoutTransition)
            resizeObserver.observe(mapContainer.value)
        }
        updateMapSizeDuringLayoutTransition()

        // 先加载 geojson
        const adminBoundary = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/sample/huz.geojson`)
            .then((res) => {
                if (!res.ok) throw new Error(`Failed to load geojson: ${res.status}`);
                return res.json() as Promise<ClipGeometryInput>;
            });
        const townBoundary = await fetch(TOWN_BOUNDARY_URL)
            .then((res) => {
                if (!res.ok) throw new Error(`Failed to load town geojson: ${res.status}`);
                return res.json();
            });

        let layer: InstanceType<typeof ZJQXGridFieldLayer> | null = null;
        let convectionTownLayer: ConvectionVectorLayer | null = null;
        let convectionOutlineLayer: ConvectionVectorLayer | null = null;

        const getGridControlOptions = () => ({
            fill: {
                ...DEFAULT_GRID_FIELD_FILL_OPTIONS,
                enabled: mapControlStore.gridFillEnabled,
                fillType: 2,
                opacity: mapControlStore.gridFillEnabled ? 1 : 0,
                colorScaleExtend: {
                    aboveMax: true,  // 大于色标最大值，继续使用最大值颜色填色
                }
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

        const isKmUnit = (unit?: string) => {
            const normalizedUnit = String(unit || '').trim().toLowerCase()
            return ['km', '公里', '千米'].includes(normalizedUnit)
        }

        const shouldRenderVisibilityAsKm = () => (
            store.currentFactorType === 'visibility'
            && store.productMode === 'live'
            && isKmUnit(store.mapRenderData.colorConfig?.unit)
        )

        const isMissingGridValue = (value: unknown, missingValue: unknown) => {
            const numericValue = Number(value)
            if (!Number.isFinite(numericValue)) return true
            if (missingValue == null) return false

            const numericMissingValue = Number(missingValue)
            return Number.isFinite(numericMissingValue) && numericValue === numericMissingValue
        }

        const convertMeterValueToKm = (value: unknown, missingValue: unknown) => {
            if (isMissingGridValue(value, missingValue)) return Number(value)
            return Number(value) / 1000
        }

        const convertOptionalMeterValueToKm = (value: unknown, missingValue: unknown) => {
            if (value == null || isMissingGridValue(value, missingValue)) return value
            return Number(value) / 1000
        }

        /**
         * 能见度接口格点值是 m，色标单位是 km。
         * 这里按色标单位把参与绘制的格点值转成 km，保证填色、文本和图例单位一致。
         * 注意不直接修改 store 中的原始数据，missingValue 也保持原值，避免缺测被误绘制。
         */
        const getRenderGridData = (gridData: any) => {
            if (!gridData || !shouldRenderVisibilityAsKm()) return gridData

            const missingValue = gridData.missingValue

            if (gridData.values instanceof Float32Array) {
                const values = new Float32Array(gridData.values.length)
                for (let index = 0; index < gridData.values.length; index++) {
                    values[index] = convertMeterValueToKm(gridData.values[index], missingValue)
                }

                return {
                    ...gridData,
                    values,
                    minValue: convertOptionalMeterValueToKm(gridData.minValue, missingValue),
                    maxValue: convertOptionalMeterValueToKm(gridData.maxValue, missingValue),
                }
            }

            if (Array.isArray(gridData.v)) {
                return {
                    ...gridData,
                    v: gridData.v.map((value: unknown) => convertMeterValueToKm(value, missingValue)),
                    minValue: convertOptionalMeterValueToKm(gridData.minValue, missingValue),
                    maxValue: convertOptionalMeterValueToKm(gridData.maxValue, missingValue),
                }
            }

            return gridData
        }

        const getColorScaleResources = () => {
            const config = store.mapRenderData.colorConfig
            if (!config?.stops?.length) return null

            const colorConfig: ColorScaleJson = {
                fieldName: config.fieldName,
                stops: config.stops,
            }
            const colorize = createColorScale(colorConfig, { mode: 'step', stopKey: 'stops' });
            const palette = createPaletteTextureData(colorConfig, { mode: 'step', stopKey: 'stops' });
            return { colorConfig, colorize, palette }
        }

        const getGridRowOrder = () => (
            store.currentFactorType === 'radiation' ? 'north-to-south' : 'south-to-north'
        );

        const removeGridLayer = () => {
            if (layer && zjqxMap) {
                zjqxMap.removeZJQXLayer(layer);
                layer = null;
            }
        }

        const removeConvectionLayers = () => {
            const map = getOpenLayersMap();
            if (!map) return;
            if (convectionTownLayer && map.getLayers().getArray().includes(convectionTownLayer)) {
                map.removeLayer(convectionTownLayer);
            }
            if (convectionOutlineLayer && map.getLayers().getArray().includes(convectionOutlineLayer)) {
                map.removeLayer(convectionOutlineLayer);
            }
            convectionTownLayer = null;
            convectionOutlineLayer = null;
        };

        const updateConvectionFeatureRisk = () => {
            const frame = store.currentConvectionFrame;
            const source = convectionTownLayer?.getSource();
            if (!frame || !source) return;

            source.getFeatures().forEach((feature) => {
                const riskLevel = getConvectionFeatureKeys(feature)
                    .map((key) => frame[key])
                    .find((risk) => risk !== undefined) ?? 0;
                feature.set('riskLevel', riskLevel);
            });
            source.changed();
        };

        const ensureConvectionLayers = () => {
            const map = getOpenLayersMap();
            const frame = store.currentConvectionFrame;
            if (!map || !store.isConvectionMode || !store.mapRenderData.convectionData || !frame) {
                removeConvectionLayers();
                return;
            }

            removeGridLayer();

            if (!convectionTownLayer) {
                const polygonBoundary = convertBoundaryLinesToPolygons(townBoundary);
                const townFeatures = geoJsonFormat.readFeatures(polygonBoundary, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: map.getView().getProjection(),
                }) as Feature[];
                convectionTownLayer = new VectorLayer({
                    source: new VectorSource({ features: townFeatures }),
                    style: getConvectionTownStyle,
                    zIndex: 330,
                    updateWhileAnimating: true,
                    updateWhileInteracting: true,
                });
                map.addLayer(convectionTownLayer);
            } else if (!map.getLayers().getArray().includes(convectionTownLayer)) {
                map.addLayer(convectionTownLayer);
            }

            if (!convectionOutlineLayer) {
                const outlineFeatures = geoJsonFormat.readFeatures(adminBoundary as any, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: map.getView().getProjection(),
                }) as Feature[];
                convectionOutlineLayer = new VectorLayer({
                    source: new VectorSource({ features: outlineFeatures }),
                    style: convectionOutlineStyle,
                    zIndex: 331,
                    updateWhileAnimating: true,
                    updateWhileInteracting: true,
                });
                map.addLayer(convectionOutlineLayer);
            } else if (!map.getLayers().getArray().includes(convectionOutlineLayer)) {
                map.addLayer(convectionOutlineLayer);
            }

            updateConvectionFeatureRisk();
        };

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
            removeConvectionLayers();

            const renderGridData = getRenderGridData(gridData)

            if (layer) {
                layer.update({
                    data: renderGridData,
                    normalize: { rowOrder: getGridRowOrder() },
                    palette: colorResources.palette,
                    colorize: colorResources.colorize,
                })
                applyGridControlOptions();
                applyGridClip();
            } else {
                const grid = normalizeWeatherGrid(renderGridData, { rowOrder: getGridRowOrder() });
                layer = new ZJQXGridFieldLayer({
                    data: grid,
                    palette: colorResources.palette,
                    colorize: colorResources.colorize,
                    clip: mapControlStore.mapClipEnabled ? { geometry: adminBoundary } : undefined,
                    ...getGridControlOptions(),
                    popup: false,
                    zIndex: 300,
                    opacity: 1,
                    renderResolutionMode: 'integer-zoom',
                    interpolate: true,
                    ratio: 1.15,
                } as ZJQXOpenLayersGridFieldLayerOptions);
                zjqxMap!.addZJQXLayer(layer);
                applyGridClip();
            }
        };

        watch(() => [store.mapRenderData.gridData], () => {
            updateGridLayer();
        }, { immediate: true, deep: true });

        watch(() => [
            store.isConvectionMode,
            store.mapRenderData.convectionData,
            store.currentConvectionFrame,
            store.timeline.currentLabel?.filePath,
        ], () => {
            ensureConvectionLayers();
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


watch(() => layoutStore.isMapFullscreen, (isFullscreen) => {
    updateMapSizeDuringLayoutTransition()
    applyFullscreenZoom(isFullscreen)
})

// 组件卸载时清理地图实例，防止内存泄漏
onUnmounted(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
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
.zjqx-base-tile-layer {
    filter: grayscale(100%) sepia(30%) invert(100%) saturate(270%);
    /* filter: grayscale(150%) contrast(10%) brightness(170%) sepia(.1) invert(.85) saturate(200%) !important; */
    /* filter: grayscale(150%) sepia(8%) invert(90%) saturate(100%) !important; */
    /* filter: brightness(0.2) contrast(1.28) saturate(0.42) hue-rotate(200deg) grayscale(0.42) !important; */
}

#map .ol-overlaycontainer,
#map .ol-overlaycontainer-stopevent {
    pointer-events: none;
    z-index: 700;
}

.map-control-station-name,
.map-control-station-value,
.map-control-county-name,
.map-control-town-name {
    position: relative;
    z-index: 710;
    display: inline-block;
    width: max-content !important;
    height: auto !important;
    pointer-events: none;
    user-select: none;
    white-space: nowrap;
    line-height: 1.2;
    text-shadow: 0 1px 5px rgba(0, 0, 0, 0.75), 0 0 6px rgba(0, 0, 0, 0.45);
    transform: translateZ(0);
}

.map-control-station-name {
    z-index: 723;
    color: #e9fbff;
    font-size: 14px;
    font-weight: 500;
}

.map-control-station-value {
    z-index: 724;
    color: #ffbb00;
    font-size: 14px;
    font-weight: 700;
}

.map-control-county-name {
    z-index: 718;
    color: #f7fbff;
    font-size: 14px;
    font-weight: 700;
    text-align: center;
    letter-spacing: 0.08em;
}

.map-control-town-name {
    z-index: 716;
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

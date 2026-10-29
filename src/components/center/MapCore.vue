<template>
    <div class="map-container" ref="mapContainer">
        <div id="map"></div>
    </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { fromLonLat, transformExtent } from 'ol/proj';
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
const VISIBILITY_RENDER_SCALE = 1000;
const COLOR_SCALE_UNDERFLOW_VALUE = -999999;
/** 地区下钻：遮罩、视角动画相关参数 */
const REGION_MASK_COLOR = 'rgba(3, 17, 34, 0.9)';
const REGION_MASK_Z_INDEX = 600;
const REGION_MASK_FADE_DURATION = 320;
const REGION_VIEW_DURATION = 620;
const REGION_VIEW_MAX_ZOOM = 12.4;
const REGION_VIEW_PANEL_GAP = 16;
const REGION_VIEW_PADDING = { top: 0.09, right: 0.08, bottom: 0.11, left: 0.08 };
/** 遮罩外环向外扩张的经纬度范围，保证缩到最小级别时也能盖住整个视野 */
const REGION_MASK_MARGIN = 15;

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

const applyFullscreenZoom = () => {
    nextTick(() => {
        updateMapSize()
        refreshMapView(true)
        window.setTimeout(() => {
            updateMapSize()
            refreshMapView(false)
        }, LAYOUT_TRANSITION_DURATION)
    })
}

/** 地区下钻用的经纬度环面结构：面 = [外环, 内环...]，环 = [[lng, lat], ...] */
type LonLatPolygon = number[][][]

/** 把地区选择里的 GeoJSON 统一整理成经纬度面集合 */
const collectRegionPolygons = (geojson: any): LonLatPolygon[] => {
    const polygons: LonLatPolygon[] = []

    const pushPolygon = (coordinates: any) => {
        if (!Array.isArray(coordinates)) return
        const rings = coordinates.map(closeRing).filter(Boolean) as number[][][]
        if (rings.length) polygons.push(rings)
    }

    const features = Array.isArray(geojson?.features) ? geojson.features : []
    features.forEach((feature: any) => {
        const geometry = feature?.geometry
        if (geometry?.type === 'Polygon') pushPolygon(geometry.coordinates)
        if (geometry?.type === 'MultiPolygon') geometry.coordinates.forEach(pushPolygon)
    })

    return polygons
}

const getRegionPolygonsLonLatExtent = (polygons: LonLatPolygon[]) => {
    let minLng = Number.POSITIVE_INFINITY
    let maxLng = Number.NEGATIVE_INFINITY
    let minLat = Number.POSITIVE_INFINITY
    let maxLat = Number.NEGATIVE_INFINITY

    polygons.forEach((rings) => rings.forEach((ring) => ring.forEach((point) => {
        const lng = Number(point[0])
        const lat = Number(point[1])
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
    })))

    return [minLng, minLat, maxLng, maxLat] as [number, number, number, number]
}

/** 下钻定位时的可视区留白：按地图舞台（左右栏之间）而不是整屏计算，避免区县被侧栏挡住 */
const getRegionFitPadding = (mapSize: number[]) => {
    const [width = 0, height = 0] = mapSize
    const basePadding = [
        height * REGION_VIEW_PADDING.top,
        width * REGION_VIEW_PADDING.right,
        height * REGION_VIEW_PADDING.bottom,
        width * REGION_VIEW_PADDING.left,
    ]

    const mapArea = mapContainer.value
    const stage = mapArea?.closest('.map-stage') as HTMLElement | null
    if (!mapArea || !stage) return basePadding

    const areaRect = mapArea.getBoundingClientRect()
    const stageRect = stage.getBoundingClientRect()
    const panelRect = document.querySelector('.control-groups')?.getBoundingClientRect()

    return [
        Math.max(basePadding[0], stageRect.top - areaRect.top),
        Math.max(basePadding[1], areaRect.right - stageRect.right),
        Math.max(basePadding[2], areaRect.bottom - stageRect.bottom),
        Math.max(basePadding[3], (panelRect?.right ?? stageRect.left) - areaRect.left + REGION_VIEW_PANEL_GAP),
    ]
}

/** 视角切到下钻区县：按区县范围做带动画的定位 */
const fitRegionExtent = (polygons: LonLatPolygon[], animate = true) => {
    const map = getOpenLayersMap() as any
    const view = getOpenLayersView() as any
    if (!map || !view || typeof view.fit !== 'function') return

    const [minLng, minLat, maxLng, maxLat] = getRegionPolygonsLonLatExtent(polygons)
    if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return

    const projection = view.getProjection?.() || 'EPSG:3857'
    const extent = transformExtent([minLng, minLat, maxLng, maxLat], 'EPSG:4326', projection)
    const padding = getRegionFitPadding(map.getSize?.() || [])

    view.fit(extent, {
        padding,
        maxZoom: REGION_VIEW_MAX_ZOOM,
        duration: animate ? REGION_VIEW_DURATION : 0,
    })
}

/** 回到整个湖州的默认视角 */
const setCityView = (animate = true) => {
    setMapZoom(layoutStore.isMapFullscreen ? FULLSCREEN_MAP_ZOOM : NORMAL_MAP_ZOOM, animate)
}

/** 当前地区的目标视角：下钻时贴合区县范围，否则回到整个湖州 */
const refreshMapView = (animate = true) => {
    const polygons = collectRegionPolygons(mapControlStore.selectedRegionBoundary)
    if (polygons.length) {
        fitRegionExtent(polygons, animate)
        return
    }
    setCityView(animate)
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
        let visibilityValueLayer: InstanceType<typeof ZJQXGridFieldLayer> | null = null;
        let convectionTownLayer: ConvectionVectorLayer | null = null;
        let convectionOutlineLayer: ConvectionVectorLayer | null = null;
        let regionMaskLayer: ConvectionVectorLayer | null = null;
        let regionMaskAnimation = 0;
        let outlineRegionKey: string | null = null;
        let cityOutlineFeatures: Feature[] = [];

        const getGridControlOptions = (options: {
            fillEnabled?: boolean
            borderEnabled?: boolean
            labelsEnabled?: boolean
        } = {}) => {
            const fillEnabled = options.fillEnabled ?? mapControlStore.gridFillEnabled
            const borderEnabled = options.borderEnabled ?? mapControlStore.gridFillEnabled
            const labelsEnabled = options.labelsEnabled ?? (mapControlStore.gridFillEnabled && mapControlStore.gridValueVisible)

            return {
                fill: {
                    ...DEFAULT_GRID_FIELD_FILL_OPTIONS,
                    enabled: fillEnabled,
                    fillType: 2,
                    opacity: fillEnabled ? 1 : 0,
                    colorScaleExtend: {
                        aboveMax: true,  // 大于色标最大值，继续使用最大值颜色填色
                    }
                },
                border: {
                    ...DEFAULT_GRID_FIELD_BORDER_OPTIONS,
                    enabled: borderEnabled,
                    color: '#fff',
                    width: 2,
                },
                labels: {
                    ...DEFAULT_GRID_FIELD_LABEL_OPTIONS,
                    enabled: labelsEnabled,
                    color: '#000',
                    fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
                    fontWeight: 500,
                },
            }
        };

        const isMeterUnit = (unit?: string) => {
            const normalizedUnit = String(unit || '').trim().toLowerCase()
            return ['m', 'meter', 'meters'].includes(normalizedUnit)
        }

        const shouldScaleVisibilityForFill = () => (
            store.currentFactorType === 'visibility'
            && isMeterUnit(store.mapRenderData.colorConfig?.unit)
        )

        const isMissingGridValue = (value: unknown, missingValue: unknown) => {
            const numericValue = Number(value)
            if (!Number.isFinite(numericValue)) return true
            if (missingValue == null) return false

            const numericMissingValue = Number(missingValue)
            return Number.isFinite(numericMissingValue) && numericValue === numericMissingValue
        }

        const scaleVisibilityMeterValue = (value: unknown, missingValue: unknown) => {
            if (isMissingGridValue(value, missingValue)) return Number(value)
            return Number(value) / VISIBILITY_RENDER_SCALE
        }

        const scaleOptionalVisibilityMeterValue = (value: unknown, missingValue: unknown) => {
            if (value == null || isMissingGridValue(value, missingValue)) return value
            return Number(value) / VISIBILITY_RENDER_SCALE
        }

        /**
         * Visibility data and legend stay in meters. The fill layer gets a
         * proportional down-scaled copy to keep large values inside the renderer range.
         */
        const getRenderGridData = (gridData: any) => {
            if (!gridData || !shouldScaleVisibilityForFill()) return gridData

            const missingValue = gridData.missingValue

            if (gridData.values instanceof Float32Array) {
                const values = new Float32Array(gridData.values.length)
                for (let index = 0; index < gridData.values.length; index++) {
                    values[index] = scaleVisibilityMeterValue(gridData.values[index], missingValue)
                }

                return {
                    ...gridData,
                    values,
                    minValue: scaleOptionalVisibilityMeterValue(gridData.minValue, missingValue),
                    maxValue: scaleOptionalVisibilityMeterValue(gridData.maxValue, missingValue),
                }
            }

            if (Array.isArray(gridData.v)) {
                return {
                    ...gridData,
                    v: gridData.v.map((value: unknown) => scaleVisibilityMeterValue(value, missingValue)),
                    minValue: scaleOptionalVisibilityMeterValue(gridData.minValue, missingValue),
                    maxValue: scaleOptionalVisibilityMeterValue(gridData.maxValue, missingValue),
                }
            }

            return gridData
        }

        const getRenderColorStops = () => {
            const stops = store.mapRenderData.colorConfig?.stops || []
            if (!shouldScaleVisibilityForFill()) return stops

            return stops.map((item) => ({
                ...item,
                value: item.value === COLOR_SCALE_UNDERFLOW_VALUE
                    ? item.value
                    : item.value / VISIBILITY_RENDER_SCALE,
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

        const getGridRowOrder = () => (
            store.currentFactorType === 'radiation' ? 'north-to-south' : 'south-to-north'
        );

        const shouldUseVisibilityValueLayer = () => shouldScaleVisibilityForFill()

        const getMainGridControlOptions = () => getGridControlOptions({
            labelsEnabled: shouldUseVisibilityValueLayer() ? false : undefined,
        })

        const getVisibilityValueControlOptions = () => {
            const controlOptions = getGridControlOptions({
                fillEnabled: false,
                borderEnabled: false,
                labelsEnabled: mapControlStore.gridFillEnabled && mapControlStore.gridValueVisible,
            })

            return {
                ...controlOptions,
                labels: {
                    ...controlOptions.labels,
                    precision: 0,
                    rounding: 1,
                    zoomPresets: (controlOptions.labels.zoomPresets || []).map((preset) => ({
                        ...preset,
                        precision: 0,
                        rounding: 1,
                    })),
                },
            }
        }

        const removeVisibilityValueLayer = () => {
            if (visibilityValueLayer && zjqxMap) {
                zjqxMap.removeZJQXLayer(visibilityValueLayer);
                visibilityValueLayer = null;
            }
        }

        const removeGridLayer = () => {
            if (layer && zjqxMap) {
                zjqxMap.removeZJQXLayer(layer);
                layer = null;
            }
            removeVisibilityValueLayer();
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
            outlineRegionKey = null;
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
                // 强对流无数据时也要把常规填充层撤掉，避免残留上一场景的热力图
                if (store.isConvectionMode) removeGridLayer();
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
                cityOutlineFeatures = geoJsonFormat.readFeatures(adminBoundary as any, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: map.getView().getProjection(),
                }) as Feature[];
                convectionOutlineLayer = new VectorLayer({
                    source: new VectorSource({ features: cityOutlineFeatures }),
                    style: convectionOutlineStyle,
                    zIndex: 331,
                    updateWhileAnimating: true,
                    updateWhileInteracting: true,
                });
                map.addLayer(convectionOutlineLayer);
                outlineRegionKey = mapControlStore.selectedRegionKey === 'regionHuzhou' ? 'regionHuzhou' : null;
            } else if (!map.getLayers().getArray().includes(convectionOutlineLayer)) {
                map.addLayer(convectionOutlineLayer);
            }

            syncConvectionOutline();
            updateConvectionFeatureRisk();
        };

        /** 描边层：下钻时描区县轮廓，否则描湖州全市轮廓 */
        const syncConvectionOutline = () => {
            if (!convectionOutlineLayer) return;

            const regionKey = mapControlStore.selectedRegionKey;
            if (outlineRegionKey === regionKey) return;

            const boundary = mapControlStore.selectedRegionBoundary;
            if (regionKey !== 'regionHuzhou' && !boundary) return;

            const features = boundary
                ? geoJsonFormat.readFeatures(boundary, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: getOpenLayersMap()?.getView().getProjection(),
                }) as Feature[]
                : cityOutlineFeatures;

            if (!features.length) return;
            convectionOutlineLayer.setSource(new VectorSource({ features }));
            outlineRegionKey = regionKey;
        };

        /** 区县遮罩：整个画面挖空下钻区县，其余区域压暗，实现“只展示当前区县” */
        const createRegionMaskFeature = (polygons: LonLatPolygon[]) => {
            const [minLng, minLat, maxLng, maxLat] = getRegionPolygonsLonLatExtent(polygons);
            const margin = REGION_MASK_MARGIN;
            const outerRing = [
                [minLng - margin, minLat - margin],
                [maxLng + margin, minLat - margin],
                [maxLng + margin, maxLat + margin],
                [minLng - margin, maxLat + margin],
                [minLng - margin, minLat - margin],
            ];
            const geometry = geoJsonFormat.readGeometry({
                type: 'Polygon',
                coordinates: [outerRing, ...polygons.map((rings) => rings[0])],
            }, {
                dataProjection: 'EPSG:4326',
                featureProjection: getOpenLayersMap()?.getView().getProjection(),
            });
            return new Feature(geometry as any);
        };

        const animateRegionMaskOpacity = (target: number) => {
            const targetLayer = regionMaskLayer;
            if (!targetLayer) return;

            if (regionMaskAnimation) cancelAnimationFrame(regionMaskAnimation);
            const start = targetLayer.getOpacity();
            const startTime = performance.now();
            const step = () => {
                const progress = Math.min(1, (performance.now() - startTime) / REGION_MASK_FADE_DURATION);
                targetLayer.setOpacity(start + (target - start) * progress);
                if (progress < 1) regionMaskAnimation = requestAnimationFrame(step);
            };
            regionMaskAnimation = requestAnimationFrame(step);
        };

        const updateRegionMask = (polygons: LonLatPolygon[]) => {
            const map = getOpenLayersMap();
            if (!map) return;

            const feature = createRegionMaskFeature(polygons);
            if (!regionMaskLayer) {
                regionMaskLayer = new VectorLayer({
                    source: new VectorSource({ features: [feature] }),
                    style: new Style({ fill: new Fill({ color: REGION_MASK_COLOR }) }),
                    zIndex: REGION_MASK_Z_INDEX,
                    opacity: 0,
                    updateWhileAnimating: true,
                    updateWhileInteracting: true,
                });
                map.addLayer(regionMaskLayer);
            } else {
                regionMaskLayer.setSource(new VectorSource({ features: [feature] }));
                regionMaskLayer.setOpacity(0);
                if (!map.getLayers().getArray().includes(regionMaskLayer)) {
                    map.addLayer(regionMaskLayer);
                }
            }
            animateRegionMaskOpacity(1);
        };

        const removeRegionMask = () => {
            if (regionMaskAnimation) {
                cancelAnimationFrame(regionMaskAnimation);
                regionMaskAnimation = 0;
            }
            const map = getOpenLayersMap();
            if (regionMaskLayer && map?.getLayers().getArray().includes(regionMaskLayer)) {
                map.removeLayer(regionMaskLayer);
            }
            regionMaskLayer = null;
        };

        /** 地区选择变化：切换区县时做一次带动画的下钻，回到湖州时恢复全市 */
        const applyRegionDrilldown = (animate = true) => {
            if (mapControlStore.isRegionDrilldown && !mapControlStore.selectedRegionBoundary) {
                void mapControlStore.loadCountyAreaResources();
                return;
            }

            const polygons = collectRegionPolygons(mapControlStore.selectedRegionBoundary);
            if (polygons.length) {
                updateRegionMask(polygons);
            } else {
                removeRegionMask();
            }

            syncConvectionOutline();
            refreshMapView(animate);
        };

        const applyGridControlOptions = () => {
            if (!layer && !visibilityValueLayer) return;
            try {
                layer?.update(getMainGridControlOptions() as any);
                visibilityValueLayer?.update(getVisibilityValueControlOptions() as any);
            } catch (error) {
                console.warn('更新填色图层显隐失败:', error);
            }
        };

        const applyLayerClip = (targetLayer: InstanceType<typeof ZJQXGridFieldLayer> | null) => {
            if (!targetLayer) return;

            const gridLayer = targetLayer as any;
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

        const applyGridClip = () => {
            applyLayerClip(layer);
            applyLayerClip(visibilityValueLayer);
        };

        const syncVisibilityValueLayer = (gridData: any, colorResources: NonNullable<ReturnType<typeof getColorScaleResources>>) => {
            if (!shouldUseVisibilityValueLayer()) {
                removeVisibilityValueLayer();
                return;
            }

            const controlOptions = getVisibilityValueControlOptions();
            if (visibilityValueLayer) {
                visibilityValueLayer.update({
                    data: gridData,
                    normalize: { rowOrder: getGridRowOrder() },
                    palette: colorResources.palette,
                    colorize: colorResources.colorize,
                    ...controlOptions,
                } as any);
                applyLayerClip(visibilityValueLayer);
                return;
            }

            const grid = normalizeWeatherGrid(gridData, { rowOrder: getGridRowOrder() });
            visibilityValueLayer = new ZJQXGridFieldLayer({
                data: grid,
                palette: colorResources.palette,
                colorize: colorResources.colorize,
                clip: mapControlStore.mapClipEnabled ? { geometry: adminBoundary } : undefined,
                ...controlOptions,
                popup: false,
                zIndex: 302,
                opacity: 1,
                renderResolutionMode: 'integer-zoom',
                interpolate: true,
                ratio: 1.15,
            } as ZJQXOpenLayersGridFieldLayerOptions);
            zjqxMap!.addZJQXLayer(visibilityValueLayer);
            applyLayerClip(visibilityValueLayer);
        };

        const updateGridLayer = () => {
            // 强对流场景的图层由 ensureConvectionLayers 接管；
            // 这里直接返回，避免切换瞬间把热力填充层清空导致“地图闪一下”
            if (store.isConvectionMode) return
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
            } else {
                const grid = normalizeWeatherGrid(renderGridData, { rowOrder: getGridRowOrder() });
                layer = new ZJQXGridFieldLayer({
                    data: grid,
                    palette: colorResources.palette,
                    colorize: colorResources.colorize,
                    clip: mapControlStore.mapClipEnabled ? { geometry: adminBoundary } : undefined,
                    ...getMainGridControlOptions(),
                    popup: false,
                    zIndex: 300,
                    opacity: 1,
                    renderResolutionMode: 'integer-zoom',
                    interpolate: true,
                    ratio: 1.15,
                } as ZJQXOpenLayersGridFieldLayerOptions);
                zjqxMap!.addZJQXLayer(layer);
            }
            syncVisibilityValueLayer(gridData, colorResources);
            applyGridControlOptions();
            applyGridClip();
        };

        watch(() => [
            store.mapRenderData.gridData,
            store.mapRenderData.colorConfig,
            store.currentFactorType,
            store.productMode,
        ], () => {
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
            mapControlStore.selectedRegionKey,
            mapControlStore.selectedRegionBoundary,
        ], () => {
            applyRegionDrilldown(true);
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


watch(() => layoutStore.isMapFullscreen, () => {
    updateMapSizeDuringLayoutTransition()
    applyFullscreenZoom()
})

// 进入强对流专题时收起雷达/地闪/输电线路图层，避免隐藏的图层继续留在地图上；
// 退出专题时地区选择回到整个湖州
watch(() => store.isConvectionMode, (isConvection) => {
    if (isConvection) layerToolbarStore.clearActiveLayer()
    else mapControlStore.resetRegion()
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

<style lang="less" scoped>
.map-container {
    width: 100%;
    height: 100%;
  #map {
      width: 100%;
      height: 100%;
  }
}


</style>

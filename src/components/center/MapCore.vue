<template>
    <div class="map-container">
        <div id="map" ref="mapContainer"></div>
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
import type { ColorScaleJson, WeatherGridJson, ClipGeometryInput } from '@zjqx/gridfield';
import { useMapStore } from '@/store'
import { getDataFile } from '@/api/weather'

const store = useMapStore()
const colorConfig: ColorScaleJson = {
    fieldName: 'temp',
    stops: [
        { value: -24, color: 'rgb(0, 0, 255)' },
        { value: -16, color: 'rgb(0, 69, 255)' },
        { value: -12, color: 'rgb(0, 101, 255)' },
        { value: -8, color: 'rgb(0, 134, 255)' },
        { value: -6, color: 'rgb(0, 166, 255)' },
        { value: -4, color: 'rgb(0, 199, 255)' },
        { value: -2, color: 'rgb(0, 235, 255)' },
        { value: 0, color: 'rgb(0, 255, 247)' },
        { value: 2, color: 'rgb(0, 255, 181)' },
        { value: 4, color: 'rgb(0, 255, 115)' },
        { value: 6, color: 'rgb(0, 255, 41)' },
        { value: 8, color: 'rgb(115, 255, 0)' },
        { value: 12, color: 'rgb(148, 255, 0)' },
        { value: 16, color: 'rgb(181, 255, 0)' },
        { value: 20, color: 'rgb(214, 255, 0)' },
        { value: 24, color: 'rgb(255, 231, 0)' },
        { value: 26, color: 'rgb(255, 199, 0)' },
        { value: 28, color: 'rgb(255, 162, 0)' },
        { value: 30, color: 'rgb(255, 130, 0)' },
        { value: 32, color: 'rgb(255, 97, 0)' },
        { value: 35, color: 'rgb(255, 65, 0)' },
        { value: 37, color: 'rgb(255, 40, 0)' },
        { value: 38, color: 'rgb(214, 0, 0)' },
        { value: 40, color: 'rgb(140, 0, 0)' }
    ]
};

const mapContainer = ref<HTMLElement | null>(null);
let zjqxMap: ReturnType<typeof ZJQXMap.initMap> | null = null;

onMounted(async () => {
    try {
        // 初始化地图
        zjqxMap = ZJQXMap.initMap('map', {
            center: [30.5941, 119.686],
            zoom: 9.3,
            zoomSnap: 0.1,
            zoomDelta: 0.1,
            maxZoom: 13,
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

        // 先加载 geojson
        const adminBoundary = await fetch('/sample/admin_region.geojson')
            .then((res) => {
                if (!res.ok) throw new Error(`Failed to load geojson: ${res.status}`);
                return res.json() as Promise<ClipGeometryInput>;
            });

        const colorize = createColorScale(colorConfig, { mode: 'step', stopKey: 'stops' });
        const palette = createPaletteTextureData(colorConfig, { mode: 'step', stopKey: 'stops' });

        let layer: InstanceType<typeof ZJQXGridFieldLayer> | null = null;

        const updateGridLayer = (gridData: any) => {
            if (!gridData || !zjqxMap) return;

            const grid = normalizeWeatherGrid(gridData, { rowOrder: 'north-to-south' });

            if (layer) {
                layer.setData(grid);
            } else {
                layer = new ZJQXGridFieldLayer({
                    data: grid,
                    palette,
                    colorize,
                    clip: { geometry: adminBoundary },
                    fill: {
                        ...DEFAULT_GRID_FIELD_FILL_OPTIONS,
                        fillType: 2,
                        opacity: 1,
                    },
                    border: {
                        ...DEFAULT_GRID_FIELD_BORDER_OPTIONS,
                        enabled: true,
                        color: '#fff',
                        width: 2,
                    },
                    labels: {
                        ...DEFAULT_GRID_FIELD_LABEL_OPTIONS,
                        enabled: true,
                        fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
                        fontWeight: 500,
                    },
                    popup: false,
                });
                zjqxMap!.addZJQXLayer(layer);
            }
        };

        // 初始化时检查数据
        if (store.mapRenderData.gridData) {
            updateGridLayer(store.mapRenderData.gridData);
        }

        // 监听 timeline 变化
        watch(() => store.mapRenderData.gridData, (newLabel) => {
            console.log(newLabel,'dsds')
            if (!layer) {
                updateGridLayer(newLabel);
            }else{
                layer.update({
                    data:newLabel
                })
            }
        }, { immediate: true });
    } catch (error) {
        console.error('Failed to initialize map:', error);
    }
});

// 组件卸载时清理地图实例，防止内存泄漏
onUnmounted(() => {
    if (zjqxMap) {
        zjqxMap.remove();
        zjqxMap = null;
    }
});
</script>

<style>
/* .leaflet-tile-pane {
    filter: grayscale(150%) contrast(10%) brightness(170%) sepia(.1) invert(.85) saturate(200%) !important;
} */
.leaflet-tile-pane {
    /* filter: grayscale(150%) sepia(8%) invert(90%) saturate(100%) !important; */
    filter: brightness(0.2) contrast(1.28) saturate(0.42) hue-rotate(200deg) grayscale(0.42) !important;
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
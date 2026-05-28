import { computed, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import dayjs from "dayjs";
import OlMap from "ol/Map.js";
import Feature from "ol/Feature.js";
import VectorLayer from "ol/layer/Vector.js";
import VectorSource from "ol/source/Vector.js";
import GeoJSON from "ol/format/GeoJSON.js";
import Point from "ol/geom/Point.js";
import Style from "ol/style/Style.js";
import CircleStyle from "ol/style/Circle.js";
import Fill from "ol/style/Fill.js";
import Stroke from "ol/style/Stroke.js";
import Overlay from "ol/Overlay.js";
import { fromLonLat } from "ol/proj.js";
import { getDataFile, getTimeList } from "@/api/weather";
import { useMapStore } from "./mapStore";
import type { LayerGroup as DashboardLayerGroup } from "@/types/dashboard";

/** 控件分组标识 */
export type MapControlGroupKey = "autoStation" | "fill" | "map";

/** 控件子项标识 */
export type MapControlItemKey =
  | "stationName"
  | "stationValue"
  | "fillValue"
  | "countyBoundary"
  | "countyName"
  | "townBoundary"
  | "townName"
  | "mapClip";

/** 自动站接口返回数据 */
export interface AutoStationItem {
  city?: string;
  cnty?: string;
  stationName?: string;
  stationId?: string | number;
  longitude?: number;
  latitude?: number;
  value?: number | string;
  srcValue?: string;
  [key: string]: any;
}

/** 时间轴单项 */
export interface ControlTimelineItem {
  dateTime: string;
  filePath: string;
}

interface MapControlItemState {
  key: MapControlItemKey;
  name: string;
  checked: boolean;
}

interface MapControlGroupState {
  key: MapControlGroupKey;
  title: string;
  switchable: boolean;
  enabled: boolean;
  items: MapControlItemState[];
}

interface OpenLayersMapLike {
  addLayer?: (layer: any) => unknown;
  removeLayer?: (layer: any) => unknown;
  getLayers?: () => { getArray: () => any[] };
  getRawMap?: () => OlMap;
  getOpenLayersMap?: () => OlMap;
  map?: OpenLayersMapLike;
  _map?: OpenLayersMapLike;
}

type ControlVectorLayer = VectorLayer<VectorSource<Feature>>;
type ControlTextLayer = Overlay[];

type AnyControlLayer = ControlVectorLayer | ControlTextLayer | null;

const DEFAULT_CONTROL_GROUPS: MapControlGroupState[] = [
  {
    key: "autoStation",
    title: "自动站",
    switchable: true,
    enabled: true,
    items: [
      { key: "stationName", name: "站名", checked: true },
      { key: "stationValue", name: "数值", checked: true },
    ],
  },
  {
    key: "fill",
    title: "填色",
    switchable: true,
    enabled: true,
    items: [{ key: "fillValue", name: "数值", checked: true }],
  },
  {
    key: "map",
    title: "地图",
    switchable: false,
    enabled: true,
    items: [
      { key: "countyBoundary", name: "区(县)界", checked: true },
      { key: "countyName", name: "区(县)名", checked: false },
      { key: "townBoundary", name: "乡镇界", checked: false },
      { key: "townName", name: "乡镇名", checked: false },
      { key: "mapClip", name: "地图裁边", checked: true },
    ],
  },
];

const COUNTY_BOUNDARY_URL = `${import.meta.env.VITE_APP_BASE_URL}/sample/country_bounder.geojson`;
const COUNTY_LONLAT_URL = `${import.meta.env.VITE_APP_BASE_URL}/sample/lonlat.json`;
const TOWN_BOUNDARY_URL = `${import.meta.env.VITE_APP_BASE_URL}/sample/town_bounder.geojson`;

const MAP_FONT_FAMILY = 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
const geoJsonFormat = new GeoJSON();

const stationPointStyle = new Style({
  image: new CircleStyle({
    radius: 3.5,
    fill: new Fill({ color: "#23e0ff" }),
    stroke: new Stroke({ color: "#ffffff", width: 1 }),
  }),
});

const COUNTY_BOUNDARY_STYLE = new Style({
  stroke: new Stroke({ color: "#76d8ff", width: 1.6, lineDash: [4, 4] }),
});

const TOWN_BOUNDARY_STYLE = new Style({
  stroke: new Stroke({ color: "#59c8ff", width: 0.65 }),
});

export const useMapControlGroupStore = defineStore("mapControlGroup", () => {
  /** 控件状态 */
  const groups = ref<MapControlGroupState[]>(
    cloneGroups(DEFAULT_CONTROL_GROUPS),
  );

  /** 是否已用页面传入的 mock 配置初始化，避免每次渲染重置用户操作 */
  const initializedByProps = ref(false);

  /** 当前地图实例，兼容 ZJQXOpenLayersMap 包装对象和 ol/Map */
  const mapInstance = shallowRef<OpenLayersMapLike | null>(null);

  /** 自动站时间轴 */
  const stationTimeline = ref<ControlTimelineItem[]>([]);

  /** 自动站数据 */
  const stationData = ref<AutoStationItem[]>([]);

  /** 自动站加载状态 */
  const stationLoading = ref(false);

  /** 自动站时间轴请求缓存 key */
  const stationTimelineKey = ref("");

  /** 自动站文件内容缓存 */
  const stationDataCache = ref<Record<string, AutoStationItem[]>>({});

  /** 县界数据 */
  const countyBoundaryData = shallowRef<any | null>(null);

  /** 县名坐标数据 */
  const countyLonlatData = shallowRef<Record<string, [number, number]> | null>(
    null,
  );

  /** 乡镇界数据 */
  const townBoundaryData = shallowRef<any | null>(null);

  /** 地图资源加载状态 */
  const countyLoading = ref(false);

  /** 乡镇资源加载状态 */
  const townLoading = ref(false);

  let stationPointLayer: ControlVectorLayer | null = null;
  let stationNameLayer: ControlTextLayer | null = null;
  let stationValueLayer: ControlTextLayer | null = null;
  let countyBoundaryLayer: ControlVectorLayer | null = null;
  let countyNameLayer: ControlTextLayer | null = null;
  let townBoundaryLayer: ControlVectorLayer | null = null;
  let townNameLayer: ControlTextLayer | null = null;

  const autoStationDisabled = computed(() => useMapStore().isForecastMode);
  const autoStationEnabled = computed(
    () =>
      !autoStationDisabled.value && (getGroup("autoStation")?.enabled ?? true),
  );
  const stationNameVisible = computed(
    () => getItem("stationName")?.checked ?? true,
  );
  const stationValueVisible = computed(
    () => getItem("stationValue")?.checked ?? true,
  );
  const gridFillEnabled = computed(() => getGroup("fill")?.enabled ?? true);
  const gridValueVisible = computed(
    () => gridFillEnabled.value && (getItem("fillValue")?.checked ?? true),
  );
  const countyBoundaryVisible = computed(
    () => getItem("countyBoundary")?.checked ?? true,
  );
  const countyNameVisible = computed(
    () => getItem("countyName")?.checked ?? false,
  );
  const townBoundaryVisible = computed(
    () => getItem("townBoundary")?.checked ?? false,
  );
  const townNameVisible = computed(() => getItem("townName")?.checked ?? false);
  const mapClipEnabled = computed(() => getItem("mapClip")?.checked ?? true);

  /** 用页面原有 layerGroups 初始化控件文案和默认勾选状态 */
  function initFromGroups(sourceGroups: DashboardLayerGroup[] = []) {
    if (
      initializedByProps.value ||
      !Array.isArray(sourceGroups) ||
      !sourceGroups.length
    )
      return;

    groups.value = DEFAULT_CONTROL_GROUPS.map((defaultGroup) => {
      const sourceGroup = sourceGroups.find(
        (item) =>
          normalizeName(item.title) === normalizeName(defaultGroup.title),
      );
      if (!sourceGroup) return cloneGroup(defaultGroup);

      return {
        ...cloneGroup(defaultGroup),
        title: sourceGroup.title,
        switchable: sourceGroup.switchable,
        enabled: sourceGroup.enabled,
        items: defaultGroup.items.map((defaultItem) => {
          const sourceItem = sourceGroup.items.find(
            (item) =>
              normalizeName(item.name) === normalizeName(defaultItem.name),
          );
          return sourceItem
            ? {
                ...defaultItem,
                name: sourceItem.name,
                checked: sourceItem.checked,
              }
            : { ...defaultItem };
        }),
      };
    });

    initializedByProps.value = true;
    refreshStationLayerVisible();
    refreshCountyLayerVisible();
    refreshTownLayerVisible();

    if (autoStationEnabled.value) loadStationDataByCurrentTime();
    if (countyBoundaryVisible.value || countyNameVisible.value)
      loadCountyResources();
    if (townBoundaryVisible.value || townNameVisible.value) loadTownResources();
  }

  function setMap(map: OpenLayersMapLike | null) {
    if (!map) {
      removeAllControlLayers();
      mapInstance.value = null;
      return;
    }

    mapInstance.value = map;
    refreshStationLayerVisible();
    refreshCountyLayerVisible();
    refreshTownLayerVisible();

    if (countyBoundaryVisible.value || countyNameVisible.value) {
      loadCountyResources();
    }
    if (townBoundaryVisible.value || townNameVisible.value) {
      loadTownResources();
    }
    if (autoStationEnabled.value) {
      loadStationDataByCurrentTime();
    }
  }

  function toggleGroup(key: MapControlGroupKey) {
    const group = getGroup(key);
    if (!group || !group.switchable || isGroupDisabled(key)) return;

    group.enabled = !group.enabled;

    if (key === "autoStation") {
      refreshStationLayerVisible();
      if (group.enabled) loadStationDataByCurrentTime();
      return;
    }
  }

  function toggleItem(key: MapControlItemKey) {
    const item = getItem(key);
    const group = getGroupByItemKey(key);
    if (
      !item ||
      (group && (!isGroupEnabled(group.key) || isGroupDisabled(group.key)))
    )
      return;

    item.checked = !item.checked;

    if (key === "stationName" || key === "stationValue") {
      refreshStationLayerVisible();
      if (autoStationEnabled.value && !stationPointLayer)
        loadStationDataByCurrentTime();
      return;
    }

    if (key === "countyBoundary" || key === "countyName") {
      if (item.checked) {
        loadCountyResources();
      } else {
        refreshCountyLayerVisible();
      }
      return;
    }

    if (key === "townBoundary" || key === "townName") {
      if (item.checked) {
        loadTownResources();
      } else {
        refreshTownLayerVisible();
      }
    }
  }

  /** 获取自动站时间轴，ncType 固定为 DATAHOUSE，ele 使用自动站专用配置 */
  async function loadStationTimeline() {
    const mapStore = useMapStore();
    const params = mapStore.stationTimelineParams;

    if (!params.ele) {
      stationTimeline.value = [];
      stationTimelineKey.value = "";
      stationData.value = [];
      renderStationLayers([]);
      return [];
    }

    const cacheKey = `${params.ncType}_${params.ele}_${params.startTime}_${params.endTime}`;
    if (stationTimelineKey.value === cacheKey && stationTimeline.value.length)
      return stationTimeline.value;

    const response = await getTimeList(params);
    stationTimeline.value = Array.isArray(response.DS) ? response.DS : [];
    stationTimelineKey.value = cacheKey;
    return stationTimeline.value;
  }

  /** 根据底部时间轴当前时次加载自动站文件内容 */
  async function loadStationDataByCurrentTime() {
    if (!autoStationEnabled.value) return;

    const mapStore = useMapStore();
    const currentTime = mapStore.timeline.currentLabel;
    const stationParams = mapStore.stationTimelineParams;
    if (!currentTime?.dateTime && !currentTime?.filePath) return;

    if (!stationParams.ele) {
      stationData.value = [];
      renderStationLayers([]);
      return;
    }

    stationLoading.value = true;
    try {
      const timeline = await loadStationTimeline();
      if (!timeline.length) {
        stationData.value = [];
        renderStationLayers([]);
        return;
      }

      const stationTimeItem = matchStationTimelineItem(timeline, currentTime);
      const filePath = stationTimeItem?.filePath;

      if (!filePath) {
        stationData.value = [];
        renderStationLayers([]);
        return;
      }

      const cacheKey = `${stationParams.ele}_${filePath}`;
      if (stationDataCache.value[cacheKey]) {
        stationData.value = stationDataCache.value[cacheKey];
        renderStationLayers(stationData.value);
        return;
      }

      const response = await getDataFile({ filePath, region: "330500" });
      const list = Array.isArray(response.DS) ? response.DS : [];
      const stationList = list.filter(isNationStation);

      stationDataCache.value[cacheKey] = stationList;
      stationData.value = stationList;
      renderStationLayers(stationList);
    } catch (error) {
      console.error("自动站数据加载失败:", error);
      stationData.value = [];
      renderStationLayers([]);
      ElMessage.error("自动站数据加载失败");
    } finally {
      stationLoading.value = false;
    }
  }

  /** 加载县界与县名坐标资源 */
  async function loadCountyResources() {
    if (!getOpenLayersMap() || countyLoading.value) return;
    if (countyBoundaryData.value && countyLonlatData.value) {
      renderCountyLayers();
      return;
    }

    countyLoading.value = true;
    try {
      const [boundary, lonlat] = await Promise.all([
        fetch(COUNTY_BOUNDARY_URL).then((res) => {
          if (!res.ok)
            throw new Error(
              `Failed to load ${COUNTY_BOUNDARY_URL}: ${res.status}`,
            );
          return res.json();
        }),
        fetch(COUNTY_LONLAT_URL).then((res) => {
          if (!res.ok)
            throw new Error(
              `Failed to load ${COUNTY_LONLAT_URL}: ${res.status}`,
            );
          return res.json();
        }),
      ]);

      countyBoundaryData.value = boundary;
      countyLonlatData.value = lonlat;
      renderCountyLayers();
    } catch (error) {
      console.error("县界资源加载失败:", error);
      ElMessage.error("县界资源加载失败");
    } finally {
      countyLoading.value = false;
    }
  }

  /** 加载乡镇界资源 */
  async function loadTownResources() {
    if (!getOpenLayersMap() || townLoading.value) return;
    if (townBoundaryData.value) {
      renderTownLayers();
      return;
    }

    townLoading.value = true;
    try {
      const boundary = await fetch(TOWN_BOUNDARY_URL).then((res) => {
        if (!res.ok)
          throw new Error(`Failed to load ${TOWN_BOUNDARY_URL}: ${res.status}`);
        return res.json();
      });

      townBoundaryData.value = boundary;
      renderTownLayers();
    } catch (error) {
      console.error("乡镇界资源加载失败:", error);
      ElMessage.error("乡镇界资源加载失败");
    } finally {
      townLoading.value = false;
    }
  }

  function renderStationLayers(list: AutoStationItem[]) {
    const map = getOpenLayersMap();
    if (!map) return;

    removeStationLayers();

    const pointFeatures: Feature[] = [];
    const nameOverlays: Overlay[] = [];
    const valueOverlays: Overlay[] = [];
    const projection = map.getView().getProjection();

    list.forEach((station) => {
      const latlng = getStationLatLng(station);
      if (!latlng) return;

      const [lat, lng] = latlng;
      const coordinate = fromLonLat([lng, lat], projection);
      const geometry = new Point(coordinate);

      pointFeatures.push(new Feature({ geometry }));

      if (station.stationName) {
        nameOverlays.push(
          createTextOverlay(
            coordinate,
            "map-control-station-name",
            String(station.stationName),
            [8, -8],
            "center-left",
          ),
        );
      }
      valueOverlays.push(
        createTextOverlay(
          coordinate,
          "map-control-station-value",
          formatStationValue(station),
          [8, 10],
          "center-left",
        ),
      );
    });

    stationPointLayer = createVectorLayer(
      pointFeatures,
      stationPointStyle,
      510,
    );
    stationNameLayer = nameOverlays;
    stationValueLayer = valueOverlays;

    refreshStationLayerVisible();
  }

  function renderCountyLayers() {
    const map = getOpenLayersMap();
    const boundary = countyBoundaryData.value;
    const lonlat = countyLonlatData.value;
    if (!map || !boundary) return;

    removeCountyLayers();

    const boundaryFeatures = geoJsonFormat.readFeatures(boundary, {
      dataProjection: "EPSG:4326",
      featureProjection: map.getView().getProjection(),
    }) as Feature[];
    countyBoundaryLayer = createVectorLayer(
      boundaryFeatures,
      COUNTY_BOUNDARY_STYLE,
      460,
    );

    const nameOverlays: Overlay[] = [];
    const projection = map.getView().getProjection();
    if (lonlat && Array.isArray(boundary.features)) {
      boundary.features.forEach((feature: any) => {
        const properties = feature?.properties || {};
        const name = properties.NAME || properties.COUNTY || "";
        const code = resolveLonlatCode(properties, lonlat);
        const point = code ? lonlat[code] : null;
        if (!name || !point) return;

        nameOverlays.push(
          createTextOverlay(
            fromLonLat([point[0], point[1]], projection),
            "map-control-county-name",
            String(name),
            [0, 0],
            "center-center",
          ),
        );
      });
    }
    countyNameLayer = nameOverlays;

    refreshCountyLayerVisible();
  }

  function renderTownLayers() {
    const map = getOpenLayersMap();
    const boundary = townBoundaryData.value;
    if (!map || !boundary) return;

    removeTownLayers();

    const boundaryFeatures = geoJsonFormat.readFeatures(boundary, {
      dataProjection: "EPSG:4326",
      featureProjection: map.getView().getProjection(),
    }) as Feature[];
    townBoundaryLayer = createVectorLayer(
      boundaryFeatures,
      TOWN_BOUNDARY_STYLE,
      450,
    );

    const nameOverlays: Overlay[] = [];
    const projection = map.getView().getProjection();
    if (Array.isArray(boundary.features)) {
      boundary.features.forEach((feature: any) => {
        const properties = feature?.properties || {};
        const name = properties.NAME || properties.TOWN || "";
        const center = getFeatureCenter(feature);
        if (!name || !center) return;
        const [lat, lng] = center;

        nameOverlays.push(
          createTextOverlay(
            fromLonLat([lng, lat], projection),
            "map-control-town-name",
            String(name),
            [0, 0],
            "center-center",
          ),
        );
      });
    }
    townNameLayer = nameOverlays;

    refreshTownLayerVisible();
  }

  function refreshStationLayerVisible() {
    toggleOpenLayersLayer(stationPointLayer, autoStationEnabled.value);
    toggleOpenLayersLayer(
      stationNameLayer,
      autoStationEnabled.value && stationNameVisible.value,
    );
    toggleOpenLayersLayer(
      stationValueLayer,
      autoStationEnabled.value && stationValueVisible.value,
    );
  }

  function refreshCountyLayerVisible() {
    toggleOpenLayersLayer(countyBoundaryLayer, countyBoundaryVisible.value);
    toggleOpenLayersLayer(countyNameLayer, countyNameVisible.value);
  }

  function refreshTownLayerVisible() {
    toggleOpenLayersLayer(townBoundaryLayer, townBoundaryVisible.value);
    toggleOpenLayersLayer(townNameLayer, townNameVisible.value);
  }

  function isGroupDisabled(key: MapControlGroupKey) {
    return key === "autoStation" && autoStationDisabled.value;
  }

  function isGroupEnabled(key: MapControlGroupKey) {
    if (isGroupDisabled(key)) return false;
    return getGroup(key)?.enabled ?? true;
  }

  function shouldShowItems(key: MapControlGroupKey) {
    const group = getGroup(key);
    if (!group) return false;
    if (!group.switchable) return true;
    return isGroupEnabled(key);
  }

  function removeAllControlLayers() {
    removeStationLayers();
    removeCountyLayers();
    removeTownLayers();
  }

  function removeStationLayers() {
    removeOpenLayersLayer(stationPointLayer);
    removeOpenLayersLayer(stationNameLayer);
    removeOpenLayersLayer(stationValueLayer);
    stationPointLayer = null;
    stationNameLayer = null;
    stationValueLayer = null;
  }

  function removeCountyLayers() {
    removeOpenLayersLayer(countyBoundaryLayer);
    removeOpenLayersLayer(countyNameLayer);
    countyBoundaryLayer = null;
    countyNameLayer = null;
  }

  function removeTownLayers() {
    removeOpenLayersLayer(townBoundaryLayer);
    removeOpenLayersLayer(townNameLayer);
    townBoundaryLayer = null;
    townNameLayer = null;
  }

  function toggleOpenLayersLayer(layer: AnyControlLayer, visible: boolean) {
    if (!layer) return;
    const map = getOpenLayersMap();
    if (!map) return;

    if (Array.isArray(layer)) {
      layer.forEach((overlay) =>
        toggleOpenLayersOverlay(map, overlay, visible),
      );
      return;
    }

    const hasLayer = hasOpenLayersLayer(map, layer);
    if (visible && !hasLayer) {
      map.addLayer(layer);
      return;
    }
    if (!visible && hasLayer) {
      map.removeLayer(layer);
    }
  }

  function removeOpenLayersLayer(layer: AnyControlLayer) {
    const map = getOpenLayersMap();
    if (!layer || !map) return;

    if (Array.isArray(layer)) {
      layer.forEach((overlay) => {
        if (overlay.getMap() === map) map.removeOverlay(overlay);
        overlay.setMap(null);
      });
      return;
    }

    if (hasOpenLayersLayer(map, layer)) map.removeLayer(layer);
  }

  function getOpenLayersMap(): OlMap | null {
    const map = mapInstance.value;
    if (!map) return null;
    if (map instanceof OlMap) return map;
    if (
      typeof map.addLayer === "function" &&
      typeof map.removeLayer === "function" &&
      typeof map.getLayers === "function"
    )
      return map as OlMap;
    const rawMap = map.getRawMap?.();
    if (rawMap) return rawMap;
    const olMap = map.getOpenLayersMap?.();
    if (olMap) return olMap;
    if (map.map) {
      mapInstance.value = map.map;
      return getOpenLayersMap();
    }
    if (map._map) {
      mapInstance.value = map._map;
      return getOpenLayersMap();
    }
    return null;
  }

  function getGroupByItemKey(key: MapControlItemKey) {
    return groups.value.find((group) =>
      group.items.some((item) => item.key === key),
    );
  }

  function getGroup(key: MapControlGroupKey) {
    return groups.value.find((group) => group.key === key);
  }

  function getItem(key: MapControlItemKey) {
    return groups.value
      .flatMap((group) => group.items)
      .find((item) => item.key === key);
  }

  return {
    groups,
    stationTimeline,
    stationData,
    stationLoading,
    countyLoading,
    townLoading,
    autoStationDisabled,
    autoStationEnabled,
    stationNameVisible,
    stationValueVisible,
    gridFillEnabled,
    gridValueVisible,
    countyBoundaryVisible,
    countyNameVisible,
    townBoundaryVisible,
    townNameVisible,
    mapClipEnabled,
    initFromGroups,
    setMap,
    toggleGroup,
    toggleItem,
    isGroupDisabled,
    isGroupEnabled,
    shouldShowItems,
    loadStationTimeline,
    loadStationDataByCurrentTime,
    loadCountyResources,
    loadTownResources,
    refreshStationLayerVisible,
    refreshCountyLayerVisible,
    refreshTownLayerVisible,
    removeAllControlLayers,
  };
});

function createVectorLayer(
  features: Feature[],
  style: Style | ((feature: Feature) => Style),
  zIndex: number,
  declutter = false,
): ControlVectorLayer {
  return new VectorLayer({
    source: new VectorSource({ features }),
    style: style as any,
    zIndex,
    declutter,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
  }) as ControlVectorLayer;
}

function createTextOverlay(
  position: number[],
  className: string,
  text: string,
  offset: [number, number] = [0, 0],
  positioning = "center-center",
) {
  const element = document.createElement("div");
  element.className = className;
  element.textContent = text;
  element.style.pointerEvents = "none";
  element.setAttribute("data-zjqx-map-text", "true");

  return new Overlay({
    element,
    position,
    offset,
    positioning: positioning as any,
    stopEvent: false,
    insertFirst: false,
  });
}

function toggleOpenLayersOverlay(
  map: OlMap,
  overlay: Overlay,
  visible: boolean,
) {
  const hasOverlay = overlay.getMap() === map;
  if (visible && !hasOverlay) {
    map.addOverlay(overlay);
    return;
  }
  if (!visible && hasOverlay) {
    map.removeOverlay(overlay);
  }
}

function hasOpenLayersLayer(map: OlMap, layer: ControlVectorLayer) {
  return map.getLayers().getArray().includes(layer);
}

function cloneGroups(groups: MapControlGroupState[]) {
  return groups.map(cloneGroup);
}

function cloneGroup(group: MapControlGroupState): MapControlGroupState {
  return {
    ...group,
    items: group.items.map((item) => ({ ...item })),
  };
}

function normalizeName(name: string) {
  return String(name || "").replace(/\s/g, "");
}

function isNationStation(station: AutoStationItem) {
  return String(station?.stationId ?? "").startsWith("58");
}

function getStationLatLng(station: AutoStationItem): [number, number] | null {
  const lat = Number(station.latitude);
  const lng = Number(station.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

function formatStationValue(station: AutoStationItem) {
  const raw = station.srcValue ?? station.value;
  if (raw === undefined || raw === null || raw === "") return "--";
  return String(raw);
}

function matchStationTimelineItem(
  timeline: ControlTimelineItem[],
  currentTime: ControlTimelineItem,
) {
  if (!timeline.length) return null;
  if (!currentTime.dateTime) {
    return (
      timeline.find((item) => item.filePath === currentTime.filePath) ||
      timeline[timeline.length - 1]
    );
  }
  const currentDate = dayjs(currentTime.dateTime);

  const exact = timeline.find((item) =>
    dayjs(item.dateTime).isSame(currentDate, "minute"),
  );
  if (exact) return exact;

  const sameHour = timeline.find((item) =>
    dayjs(item.dateTime).isSame(currentDate, "hour"),
  );
  if (sameHour) return sameHour;

  return timeline.reduce((closest, item) => {
    const closestDiff = Math.abs(
      dayjs(closest.dateTime).valueOf() - currentDate.valueOf(),
    );
    const itemDiff = Math.abs(
      dayjs(item.dateTime).valueOf() - currentDate.valueOf(),
    );
    return itemDiff < closestDiff ? item : closest;
  }, timeline[0]);
}

function resolveLonlatCode(
  properties: Record<string, any>,
  lonlat: Record<string, [number, number]>,
) {
  const candidates = [
    properties.adcode,
    properties.split1,
    properties.GNID,
    properties.GNID_2,
  ]
    .filter((item) => item !== undefined && item !== null)
    .map((item) => String(item).replace(/\.0$/, ""));

  for (const code of candidates) {
    if (lonlat[code]) return code;

    const stripCountyCode = code.replace(/0+$/, "");
    if (lonlat[stripCountyCode]) return stripCountyCode;

    const sixCode = code.slice(0, 6);
    if (lonlat[sixCode]) return sixCode;
  }

  return "";
}

function getFeatureCenter(feature: any): [number, number] | null {
  const points: [number, number][] = [];
  collectLngLat(feature?.geometry?.coordinates, points);
  if (!points.length) return null;

  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  points.forEach(([lng, lat]) => {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return null;
  return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
}

function collectLngLat(coords: any, points: [number, number][]) {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    points.push([Number(coords[0]), Number(coords[1])]);
    return;
  }
  coords.forEach((item) => collectLngLat(item, points));
}

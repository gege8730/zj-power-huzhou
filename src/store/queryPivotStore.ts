import { ref, computed } from "vue";
import { defineStore } from "pinia";

/** 站点选项：城市名 -> 站点值 */
export interface StationOption {
  name: string;
  code: string;
}

/** 一级 tab 标识 */
export type PrimaryTabKey = "yesterday" | "today";

export const useQueryPivotStore = defineStore("queryPivot", () => {
  const stations: StationOption[] = [
    { name: "湖州", code: "K5454" },
    { name: "长兴", code: "58443" },
    { name: "安吉", code: "58446" },
    { name: "德清", code: "58454" },
    { name: "南浔", code: "K5004" },
  ];

  const selectedCity = ref("湖州");

  /** 当前选中的站点值 */
  const stationCode = computed(
    () => stations.find((item) => item.name === selectedCity.value)?.code ?? "",
  );

  // 一级 tab：昨日评估 / 今日预报（侧边栏文件列表与评估页共用）
  const activePrimary = ref<PrimaryTabKey>("yesterday");

  function setSelectedCity(name: string) {
    selectedCity.value = name;
  }

  function setActivePrimary(key: PrimaryTabKey) {
    activePrimary.value = key;
  }

  return {
    stations,
    selectedCity,
    stationCode,
    activePrimary,
    setSelectedCity,
    setActivePrimary,
  };
});

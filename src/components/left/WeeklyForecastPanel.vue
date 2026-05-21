<template>
  <div class="home7dayBackView">
    <div class="dayTempHeaderBackBiew">
      <div class="dayTempHeaderOfTimeBackBiew" v-for="(value, index) in displayList" :key="index">
        <div class="weekTitle">{{ value.weekDay }}</div>
        <div class="weekDay">{{ value.dateTime }}</div>

        <div class="sectionTitleIcon">
          <img v-if="value.imageIcon" class="weatherIcon" :src="value.imageIcon" alt="" />
        </div>

        <div class="home7_temp">
          {{ value.WEA12 }}
        </div>
      </div>
    </div>

    <div class="dayTempHContentBackBiew">
      <EChart :option="(option as unknown) as Record<string, unknown>" />
    </div>

    <div class="dayTempBottomBackBiew">
      <div class="dayTempHeaderOfTimeBackBiew" v-for="(value, index) in displayList" :key="`night-${index}`">
        <div class="sectionTitleIcon">
          <img v-if="value.imagNightIcon" class="weatherIcon" :src="value.imagNightIcon" alt="" />
        </div>

        <div class="home7_temp nightTempText">
          {{ value.WEA24 }}
        </div>
      </div>
    </div>
  </div>
  <p class="btm_tip">智能网格客观预报产品，未经人工校正</p>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import EChart from '../common/EChart.vue';

const props = defineProps<{
  listArray: any[];
}>();

function formatDate(dateTime: string) {
  const str = String(dateTime || '');
  const [datePart] = str.split(' ');
  const parts = datePart.split('-');
  if (parts.length >= 3) return `${parts[1]}-${parts[2]}`;
  return str;
}

function getWeekString(weekString: string) {
  const text = String(weekString || '');
  if (text.includes('星期一')) return '周一';
  if (text.includes('星期二')) return '周二';
  if (text.includes('星期三')) return '周三';
  if (text.includes('星期四')) return '周四';
  if (text.includes('星期五')) return '周五';
  if (text.includes('星期六')) return '周六';
  if (text.includes('星期日')) return '周日';
  return text;
}

const displayList = computed(() => {
  return (props.listArray || []).map((item) => {
    const dayWt = item.ww01cn
    return {
      ...item,
      dateTime: formatDate(item.time),
      weekDay: getWeekString(item.weekDay),
      WEA12: dayWt,
      WEA24: item.ww02cn,
      T_MAX: Math.floor(Number(item.tmax ?? 0)),
      T_MIN: Math.floor(Number(item.tmin ?? 0)),
      imageIcon: item.ww01IconUrl,
      imagNightIcon: item.ww02IconUrl,
    };
  });
});

const maxTemps = computed(() => displayList.value.map((item) => item.T_MAX));
const minTemps = computed(() => displayList.value.map((item) => item.T_MIN));

const option = computed(() => {
  const yMin = minTemps.value.length ? Math.min(...minTemps.value) : 0;

  return {
    animation: false,
    grid: {
      left: '-2%',
      right: '0%',
      top: '20%',
      bottom: '30%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: displayList.value.map((_, index) => String(index + 1)),
      axisTick: { show: false },
      axisLabel: { show: false },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: yMin,
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      boundaryGap: [0, 0.1],
    },
    series: [
      {
        name: 'daytime',
        type: 'line',
        data: maxTemps.value,
        symbol: 'circle',
        symbolSize: 6,
        smooth: true,
        itemStyle: {
          color: '#FBDB85',
        },
        lineStyle: {
          color: '#fcbf36',
          width: 2,
        },
        label: {
          show: true,
          position: 'top',
          formatter: (value: { value: number | string }) => {
            return `{b|${value.value}℃}`;
          },
          rich: {
            b: {
              color: '#fff',
              align: 'center',
              fontSize: 13,
            },
          },
        },
      },
      {
        name: 'night',
        type: 'line',
        data: minTemps.value,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: {
          color: '#91DCFF',
        },
        lineStyle: {
          color: '#91DCFF',
          width: 2,
        },
        label: {
          show: true,
          position: 'bottom',
          formatter: (value: { value: number | string }) => {
            return `{b|${value.value}℃}`;
          },
          rich: {
            b: {
              color: '#fff',
              align: 'center',
              fontSize: 13,
            },
          },
        },
      },
    ],
  };
});

// 监听数据源变化，确保图表在异步数据到达时重新渲染
watch(
  () => props.listArray,
  (newVal) => {
    console.log('七天预报数据更新，数据条数:', newVal?.length)
  },
  { deep: true }
);
</script>

<style scoped lang="less">
.home7dayBackView {
  position: relative;
  width: 100%;
  height: calc(55%);
  box-sizing: border-box;
}

.dayTempHeaderBackBiew {
  position: relative;
  margin-bottom: 10px;
  width: 100%;
  display: flex;
  justify-content: space-around;
}

.dayTempHeaderOfTimeBackBiew {
  color: #ffffff;
  position: relative;
  width: 14%;
  display: grid;
  gap: 3px;
}

.dayTempHContentBackBiew {
  position: relative;
  height: calc(100% - 145px);
  width: 100%;
}

.dayTempBottomBackBiew {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: space-around;
  margin-top: 2px;
}

.weekTitle {
  font-size: 12px;
  text-align: center;
  color: white;
}

.weekDay {
  width: 100%;
  color: white;
  font-size: 13px;
  text-align: center;
}

.sectionTitleIcon {
  left: 0;
  position: relative;
  white-space: pre;
  text-align: center;
  display: block;
}

.weatherIcon {
  width: 25px;
  height: 25px;
  object-fit: contain;
}

.home7_temp {
  color: white;
  font-size: 12px;
  text-align: center;
  position: relative;
  display: block;
  word-break: break-all;
}

.btm_tip {
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  text-align: center;
  position: absolute;
  bottom: 0;
  left: 0 ;
  width: calc(100%);
}
</style>
<template>
  <header
    class="top-header"
    :class="{ 'top-header--page': variant === 'page' }"
  >
    <div class="date-block">
      <div class="time">{{ currentTime }}</div>
      <div class="date">{{ date }}</div>
    </div>
    <div class="week">{{ week }}</div>
    <div class="left_tab">
      <div class="home" :class="{ active: isHome }" @click="goHome">
        <!-- <img src="../../assets/home/home.png" alt="首页"> -->
        <span>首页</span>
      </div>
      <div class="home" :class="{ active: isConvection }" @click="enterConvection">
        <span>强对流</span>
      </div>
      <div class="home" style="cursor: not-allowed">
        <span>新能源</span>
      </div>
      <div class="home" style="cursor: not-allowed">
        <span>台风</span>
      </div>
    </div>
    <div class="right_tab">
      <div
        class="query_pivot"
        style="cursor: not-allowed"
      >
        <span>地质灾害</span>
      </div>
      <div
        class="query_pivot"
        style="cursor: not-allowed"
      >
        <span>重要材料</span>
      </div>
      <div
        class="query_pivot"
        :class="{ active: isQueryPivot }"
        @click="router.push('/queryPivot/query')"
      >
        <!-- <img src="../../assets/home/doc.png" alt="数据查询"> -->
        <span>数据查询</span>
      </div>
      <div
        class="query_pivot"
        style="cursor: not-allowed"
      >
        <span>用户管理</span>
      </div>
    </div>

    <div class="header-actions">
      <div class="user-info">
        <svg class="user-icon" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="5.2" r="2.85" fill="currentColor" />
          <path
            d="M8 9.5c-3.05 0-5.5 1.95-5.5 4.4 0 .6.48 1.1 1.08 1.1h8.84c.6 0 1.08-.5 1.08-1.1 0-2.45-2.45-4.4-5.5-4.4z"
            fill="currentColor"
          />
        </svg>
        {{ userText }}
      </div>
      <span
        class="fullscreen-btn"
        :class="{ active: layoutStore.isMapFullscreen }"
        :title="layoutStore.isMapFullscreen ? '退出全屏' : '全屏'"
        @click="layoutStore.toggleMapFullscreen()"
      >
        <svg class="fullscreen-icon" viewBox="0 0 16 16" aria-hidden="true">
          <g
            v-if="!layoutStore.isMapFullscreen"
            fill="none"
            stroke="currentColor"
            stroke-width="1.35"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M2 6V3.4A1.4 1.4 0 0 1 3.4 2H6" />
            <path d="M10 2h2.6A1.4 1.4 0 0 1 14 3.4V6" />
            <path d="M14 10v2.6a1.4 1.4 0 0 1-1.4 1.4H10" />
            <path d="M6 14H3.4A1.4 1.4 0 0 1 2 12.6V10" />
          </g>
          <g
            v-else
            fill="none"
            stroke="currentColor"
            stroke-width="1.35"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M6 2v2.6A1.4 1.4 0 0 1 4.6 6H2" />
            <path d="M14 6h-2.6A1.4 1.4 0 0 1 10 4.6V2" />
            <path d="M10 14v-2.6a1.4 1.4 0 0 1 1.4-1.4H14" />
            <path d="M2 10h2.6A1.4 1.4 0 0 1 6 11.4V14" />
          </g>
        </svg>
        <span>{{ layoutStore.isMapFullscreen ? "退出全屏" : "全屏" }}</span>
      </span>
    </div>
  </header>
</template>
<script setup lang="ts">
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useLayoutStore } from "@/store";
import { computed } from "vue";

defineProps<{
  variant?: "dashboard" | "page";
}>();

dayjs.locale("zh-cn");
let currentTime = ref(dayjs().format("HH:mm:ss"));
let date = dayjs().format("YYYY年MM月DD日");
let week = dayjs().format("dddd");
const userText = "用户793633";
let timer: number;
const router = useRouter();
const route = useRoute();
const layoutStore = useLayoutStore();

// 当前路由高亮：首页/强对流按路由精确匹配，数据查询按前缀匹配
const isConvection = computed(() => route.path === "/convection");
const isHome = computed(() => route.path === "/");
const isQueryPivot = computed(() => route.path.startsWith("/queryPivot/"));

function enterConvection() {
  if (route.path === "/convection") return;
  router.push("/convection");
}

function goHome() {
  if (route.path === "/") return;
  router.push("/");
}

onMounted(() => {
  timer = setInterval(() => {
    currentTime.value = dayjs().format("HH:mm:ss");
  }, 500);
});

onUnmounted(() => {
  clearInterval(timer);
});
</script>
<style lang="less" scoped>
.top-header {
  --tab-active-bg:
    linear-gradient(
      90deg,
      transparent,
      rgba(255, 226, 120, 0.95) 50%,
      transparent
    )
    center bottom / 70% 2px no-repeat,
    linear-gradient(
      180deg,
      rgba(214, 190, 70, 0) 0%,
      rgba(214, 190, 70, 0.28) 45%,
      rgba(222, 196, 74, 0.72) 100%
    );
  grid-column: 1 / -1;
  grid-row: 1;
  position: relative;
  left: calc(-1 * 1 * var(--edge-x));
  width: calc(100% + 2 * var(--edge-x));
  height: calc(100%);
  display: flex;
  align-items: flex-start;
  padding: 1.15vh 0;
  background:
    url("../../assets/header.png"),
    linear-gradient(180deg, rgba(7, 62, 106, 0.86), rgba(7, 28, 62, 0.2));
  background-size: 100% 100%; /* 同时作用于两个背景 */
  background-repeat: no-repeat;
  overflow: hidden;
  z-index: 2;
}

.top-header--page {
  grid-column: auto;
  grid-row: auto;
  left: 0;
  width: 100%;
  height: var(--header-h);
  flex: 0 0 var(--header-h);
}

.top-header::before {
  content: "";
  position: absolute;
  left: 25%;
  top: 0;
  width: 150%;
  height: 96%;
  transform: translateX(-50%);
  background: linear-gradient(
    105deg,
    transparent 0%,
    transparent 35%,
    rgba(146, 146, 146, 0.08) 43%,
    rgba(81, 133, 146, 0.452) 50%,
    rgba(139, 139, 139, 0.16) 56%,
    transparent 60%,
    transparent 100%
  );
  background-size: 230% 100%;
  background-position: 135% 0;
  mix-blend-mode: screen;
  pointer-events: none;
  z-index: 1;
  animation: title-highlight-sweep 3s ease-in-out infinite;
}

@keyframes title-highlight-sweep {
  0%,
  18% {
    opacity: 0;
    background-position: 0 0;
  }
  30% {
    opacity: 1;
  }
  64% {
    opacity: 0.95;
    background-position: -135% 0;
  }
  100% {
    opacity: 0;
    background-position: -135% 0;
  }
}
.date-block {
  width: clamp(6rem, 6.4vw, 8rem);
  margin-left: clamp(2rem, 3.8vw, 4.6rem);
  text-align: center;
  color: #f4fbff;
  z-index: 2;
}

.time {
  font-size: clamp(0.9rem, 0.85vw, 1.05rem);
  line-height: 1.15;
  letter-spacing: 0.03em;
}

.date {
  font-size: clamp(0.75rem, 0.75vw, 0.95rem);
}

.week {
  margin-left: clamp(0.5rem, 1vw, 2.2rem);
  margin-top: 0.15rem;
  font-size: clamp(1rem, 1vw, 1.25rem);
  letter-spacing: 0.12em;
  z-index: 2;
}
.left_tab {
  width: clamp(26rem, 1vw, 29rem);
  height: clamp(2.2rem, 1vh, 2.3rem);
  background: url("../../assets/home/left_tab.png") no-repeat;
  background-size: 100% 100%;
  color: #bfe3ff;
  margin-top: 0.3rem;
  margin-left: clamp(2rem, 3.8vw, 2.3rem);
  padding: 0 2.4rem;
  display: flex;
}
.home {
  // margin-left: clamp(0.5rem, 1vw, 2.2rem);
  font-size: clamp(0.8rem, 1vw, 1rem);
  // letter-spacing: 0.12em;
  z-index: 2;
  // display: flex;
  // align-items: center;
  // justify-content: center;
  // gap: 0.3rem;
  width: 25%;
  // height: clamp(2.6rem,1vh, 12.32rem);
  // background: url('../../assets/home/tab_left.png') no-repeat;
  // background-size: 100% 100%;
  color: #bfe3ff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    color 0.22s ease,
    background 0.22s ease,
    box-shadow 0.22s ease;
  &:hover {
    color: #fff;
  }
  &.active {
    color: #fff;
    font-weight: 600;
    // text-shadow: 0 0 8px rgba(255, 226, 120, 0.7);
    background: var(--tab-active-bg);
  }
}
.right_tab {
  position: absolute;
  right: clamp(16.5rem, 2vw, 21rem);
  width: clamp(29rem, 1vw, 32rem);
  height: clamp(2.2rem, 1vh, 2.3rem);
  background: url(../../assets/home/right_tab.png) no-repeat;
  background-size: 100% 100%;
  color: #bfe3ff;
  margin-top: 0.3rem;
  padding: 0 2rem;
  display: flex;
}
.query_pivot {
  font-size: clamp(0.8rem, 1vw, 1rem);
  letter-spacing: 0.12em;
  z-index: 2;
  width: 25%;
  display: flex;
  align-items: center;
  justify-content: center;
  // align-items: center;
  // justify-content: center;
  // gap: 0.3rem;
  // width: clamp(9rem, 1vw, 12rem);
  // height: clamp(2.6rem, 1vh, 12.32rem);
  // background: url("../../assets/home/tab_right.png") no-repeat;
  // background-size: 100% 100%;
  color: #bfe3ff;
  cursor: pointer;
  transition:
    color 0.22s ease,
    text-shadow 0.22s ease,
    filter 0.22s ease;
  // img {
  //   width: 1rem;
  //   height: 1rem;
  //   transition: filter 0.22s ease;
  // }
  &:hover {
    color: #fff;
  }
  &.active {
    color: #fff;
    font-weight: 600;
    text-shadow: 0 0 8px rgba(255, 226, 120, 0.7);
    background: var(--tab-active-bg);
  }
}
.title-wrap {
  position: absolute;
  left: 50%;
  top: 0;
  width: clamp(42rem, 46vw, 58rem);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateX(-50%);
  background: linear-gradient(
    90deg,
    transparent,
    rgba(3, 60, 105, 0.85) 18%,
    rgba(3, 60, 105, 0.95) 82%,
    transparent
  );
}
h1 {
  position: relative;
  margin: 0;
  font-size: clamp(2rem, 2.08vw, 2.8rem);
  line-height: var(--header-h);
  font-weight: 900;
  font-style: italic;
  letter-spacing: 0.18em;
  white-space: nowrap;
}

.slash {
  position: absolute;
  top: 39%;
  color: #16c7ff;
  font-size: clamp(1.35rem, 1.5vw, 2rem);
  font-weight: 900;
  letter-spacing: 0.25em;
  opacity: 0.75;
}

.slash.left {
  left: 15%;
}

.slash.right {
  right: 14%;
}

.header-actions {
  position: absolute;
  right: clamp(1rem, 2vw, 2.4rem);
  top: 25%;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: clamp(0.55rem, 0.75vw, 0.9rem);
}

.user-info {
  color: #c3e8f8;
  font-size: clamp(0.75rem, 0.75vw, 0.95rem);
  display: flex;
  align-items: center;
  gap: 0.34rem;
  white-space: nowrap;
}

.user-icon {
  width: clamp(0.95rem, 1vw, 1.15rem);
  height: clamp(0.95rem, 1vw, 1.15rem);
  flex: 0 0 auto;
}

.fullscreen-btn {
  height: clamp(1.55rem, 2.5vh, 2rem);
  min-width: clamp(4.4rem, 4.4vw, 5.6rem);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.32rem;
  padding: 0 0.62rem;
  border: none;
  border-radius: 0.16rem;
  color: #dff8ff;
  font-size: clamp(0.72rem, 0.72vw, 0.9rem);
  background: transparent;
  cursor: pointer;
  transition: color 0.22s ease;
}

.fullscreen-btn:hover,
.fullscreen-btn.active {
  color: #fff381;
}

.fullscreen-icon {
  width: 0.95rem;
  height: 0.95rem;
  flex: 0 0 0.95rem;
  overflow: visible;
}
</style>

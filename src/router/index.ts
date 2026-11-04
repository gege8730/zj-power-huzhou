import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** 仪表盘场景：常规要素 / 强对流专题 */
    scene?: 'home' | 'convection'
  }
}

/** 首页与强对流专题共用同一个视图，场景由路由决定 */
const DashboardView = () => import('@/views/DashboardView.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: { scene: 'home' },
    // 兼容旧链接 /?scene=convection
    beforeEnter: (to) => {
      if (to.query.scene !== 'convection') return true
      const query = { ...to.query }
      delete query.scene
      return { path: '/convection', query }
    },
  },
  {
    path: '/convection',
    name: 'convection',
    component: DashboardView,
    meta: { scene: 'convection' },
  },
  {
    path: '/queryPivot',
    name: 'queryPivot',
    component: () => import('@/views/QueryPivotView/index.vue'),
    redirect: '/queryPivot/assess',
    children: [
      {
        path: 'query',
        name: 'query',
        component: () => import('@/views/QueryPivotView/query/index.vue'),
      },
      {
        path: 'assess',
        name: 'assess',
        component: () => import('@/views/QueryPivotView/assess/index.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router

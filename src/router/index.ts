import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
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

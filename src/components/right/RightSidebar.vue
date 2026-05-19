<template>
  <aside class="right-sidebar fade-in">
    <ShortWarningPanel :rows="warning" />
    <SimilarDayPanel :days="similarDays" />
    <ImportantMaterialsPanel :tabs="materialTabs" :files="materialFiles" />
  </aside>
</template>

<script setup lang="ts">
import type { MaterialFile, SimilarDay, WarningRow } from '../../types/dashboard'
import ImportantMaterialsPanel from './ImportantMaterialsPanel.vue'
import ShortWarningPanel from './ShortWarningPanel.vue'
import SimilarDayPanel from './SimilarDayPanel.vue'

defineProps<{
  warning: WarningRow[]
  similarDays: SimilarDay[]
  materialTabs: string[]
  materialFiles: MaterialFile[]
}>()
</script>

<style scoped>
.right-sidebar {
  grid-column: 3;
  grid-row: 2;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--panel-gap);
  z-index: 2;
}
</style>

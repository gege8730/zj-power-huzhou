<template>
  <div class="control-groups">
    <section
      v-for="group in controlStore.visibleGroups"
      :key="group.key"
      class="control-panel neon-border"
      :class="{ collapsed: !controlStore.shouldShowItems(group.key), disabled: controlStore.isGroupDisabled(group.key) }"
    >
      <header>
        <span>{{ group.title }}</span>
        <span
          v-if="group.switchable"
          class="switch"
          :class="{ on: controlStore.isGroupEnabled(group.key), disabled: controlStore.isGroupDisabled(group.key) }"
          @click="controlStore.toggleGroup(group.key)"
        >
          <i />
        </span>
        <button
          v-else-if="controlStore.isGroupCollapsible(group.key)"
          class="collapse-toggle"
          :class="{ collapsed: group.collapsed }"
          type="button"
          :aria-label="group.collapsed ? '展开' : '收起'"
          @click="controlStore.toggleGroupCollapse(group.key)"
        >
          <span class="collapse-arrow">⌃</span>
        </button>
      </header>
      <div
        v-show="controlStore.shouldShowItems(group.key)"
        class="check-grid"
        :class="{ 'area-grid': group.kind === 'radio' }"
      >
        <template v-if="group.kind === 'radio'">
          <span
            v-for="item in group.items"
            :key="item.key"
            class="area-item"
            :class="{ active: item.checked }"
            @click="controlStore.selectRegionItem(item.key)"
          >
            {{ item.name }}
          </span>
        </template>
        <template v-else>
          <label
            v-for="item in group.items"
            :key="`${group.key}-${item.key}`"
            class="check-item"
            :class="{ disabled: !controlStore.isGroupEnabled(group.key) }"
            @click="controlStore.toggleItem(item.key)"
          >
            <span class="checkbox" :class="{ checked: item.checked }"></span>
            {{ item.name }}
          </label>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useMapControlGroupStore } from '@/store'
import type { LayerGroup } from '../../types/dashboard'

const props = defineProps<{
  groups: LayerGroup[]
}>()

const controlStore = useMapControlGroupStore()

onMounted(() => {
  controlStore.initFromGroups(props.groups)
})

watch(() => props.groups, (groups) => {
  controlStore.initFromGroups(groups)
}, { deep: true })
</script>

<style scoped>
.control-groups {
  position: absolute;
  left: 0;
  top: 4.3%;
  width: clamp(8.5rem, 10.7vw, 10.2rem);
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 1.7vh, 1.05rem);
  z-index: 5;
}

.control-panel {
  overflow: hidden;
  transition: padding 0.18s ease, opacity 0.18s ease;
  padding: clamp(0.45rem, 0.85vh, 0.55rem) 0.65rem clamp(0.5rem, 0.9vh, 0.65rem);
  background: rgba(0, 57, 103, .9);
  border-top-left-radius: .37037037vh;
  border-top-right-radius: .37037037vh;
  border-bottom-left-radius: .20833333vw;
  border-bottom-right-radius: .20833333vw;
  box-sizing: border-box;
  border-width: 1px 1px 1px 0px;
  border-style: solid;
  border-color: #336ec799;
  box-shadow: inset 1px 0 #67a3ff;
}

.control-panel.collapsed {
  padding-bottom: clamp(0.45rem, 0.85vh, 0.55rem);
}

.control-panel.disabled {
  opacity: 0.66;
}

header {
  min-height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  color: #f7fbff;
  font-size: clamp(0.72rem, 0.73vw, 0.9rem);
  font-weight: 800;
}

.switch {
  position: relative;
  width: 2.1rem;
  height: 1rem;
  border-radius: 999rem;
  background: rgba(35, 95, 164, 0.9);
  cursor: pointer;
  transition: background 0.18s ease;
}

.switch.disabled {
  cursor: not-allowed;
}

.switch i {
  position: absolute;
  top: 12%;
  left: 6%;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: #bfefff;
  transition: left 0.18s ease;
}

.switch.on {
  background: #238cff;
}

.switch.on i {
  left: 59%;
}

.check-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  row-gap: 0.42rem;
  column-gap: 0.3rem;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 0.38rem;
  color: #d8f2ff;
  font-size: clamp(0.68rem, 0.68vw, 0.82rem);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}

.check-item:hover {
  color: #fff9c7;
}

.check-item.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.special-layout {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  row-gap: 0.42rem;
  column-gap: 0.3rem;
}

.special-layout .full-width {
  grid-column: 1 / -1;
}

.checkbox {
  position: relative;
  width: 0.82rem;
  height: 0.82rem;
  flex: 0 0 0.82rem;
  border: 1px solid #1dbdff;
  background: rgba(0, 42, 89, 0.8);
}

.checkbox.checked {
  background: #1295ff;
}

.checkbox.checked::after {
  content: "✓";
  position: absolute;
  left: 0.06rem;
  top: -0.34rem;
  font-size: 0.95rem;
  color: #fff;
}

.collapse-toggle {
  width: 1.15rem;
  height: 1.15rem;
  padding: 0;
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #8fd4ff;
  font-size: clamp(0.72rem, 0.72vw, 0.86rem);
  line-height: 1;
  background: transparent;
  cursor: pointer;
  transition: color 0.18s ease, transform 0.18s ease;
}

.collapse-toggle:hover {
  color: #fff;
}

.collapse-toggle .collapse-arrow {
  display: inline-block;
  transform: rotate(180deg);
  transition: transform 0.18s ease;
}

.collapse-toggle.collapsed .collapse-arrow {
  transform: rotate(0deg);
}

.area-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  row-gap: 0.42rem;
  column-gap: 0.3rem;
}

.area-item {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: clamp(1.25rem, 2.3vh, 1.6rem);
  padding: 0 0.2rem;
  border: 1px solid rgba(29, 141, 233, 0.5);
  border-radius: 0.12rem;
  color: #cfeaff;
  font-size: clamp(0.68rem, 0.68vw, 0.82rem);
  white-space: nowrap;
  background: rgba(3, 52, 104, 0.55);
  cursor: pointer;
  user-select: none;
  transition: color 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.area-item:hover {
  color: #fff;
  border-color: rgba(60, 190, 255, 0.85);
}

.area-item.active {
  color: #fff;
  font-weight: 700;
  border-color: #7fd0ff;
  background: linear-gradient(180deg, rgba(58, 164, 255, 0.95), rgba(16, 110, 214, 0.95));
  box-shadow: 0 0 0.5rem rgba(49, 200, 255, 0.45);
}
</style>

<template>
  <div class="control-groups">
    <section v-for="group in groups" :key="group.title" class="control-panel neon-border">
      <header>
        <span>{{ group.title }}</span>
        <span v-if="group.switchable" class="switch" :class="{ on: group.enabled }">
          <i />
        </span>
      </header>
      <div class="check-grid">
        <label v-for="(item, index) in group.items" :key="`${group.title}-${item.name}`" class="check-item" >
          <span class="checkbox" :class="{ checked: item.checked }"></span>
          {{ item.name }}
        </label>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { LayerGroup } from '../../types/dashboard'

defineProps<{
  groups: LayerGroup[]
}>()
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
}

.switch i {
  position: absolute;
  top: 12%;
  left: 6%;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: #bfefff;
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
</style>

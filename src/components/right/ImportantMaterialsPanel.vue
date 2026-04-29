<template>
  <BasePanel title="重要材料" class-name="materials" body-class="materials-body">
    <div class="tabs">
      <button
        v-for="(tab, index) in tabs"
        :key="tab"
        class="badge-button"
        :class="{ active: index === 0 }"
        type="button"
      >
        {{ tab }}
      </button>
    </div>
    <div class="file-list">
      <div v-for="file in files" :key="file.title" class="file-card neon-border">
        <div class="file-icon">▣</div>
        <div>
          <div class="file-title">{{ file.title }}</div>
          <div class="file-time">{{ file.updateTime }}</div>
        </div>
      </div>
    </div>
  </BasePanel>
</template>

<script setup lang="ts">
import type { MaterialFile } from '../../types/dashboard'
import BasePanel from '../common/BasePanel.vue'

defineProps<{
  tabs: string[]
  files: MaterialFile[]
}>()
</script>

<style scoped>
.materials {
  flex: 1 1 0;
  min-height: 16rem;
}

.materials-body {
  display: flex;
  flex-direction: column;
  padding-top: clamp(0.45rem, 0.8vh, 0.6rem);
}

.tabs {
  display: flex;
  gap: clamp(0.45rem, 0.7vw, 0.7rem);
  margin-bottom: clamp(0.5rem, 0.9vh, 0.7rem);
}

.tabs .badge-button {
  min-width: auto;
  width: 5.2rem;
  height: clamp(1.8rem, 3.2vh, 2.2rem);
  padding: 0;
  border-radius: 0.3rem;
  font-size: clamp(0.75rem, 0.78vw, 0.95rem);
  font-weight: 700;
}

.tabs .badge-button.active {
  background: linear-gradient(180deg, rgba(17, 141, 233, 1), rgba(3, 87, 169, 0.96));
}

.file-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(0.45rem, 0.85vh, 0.6rem);
}

.file-card {
  flex: 1;
  min-height: clamp(2.6rem, 4.8vh, 3.35rem);
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0 clamp(0.8rem, 1vw, 1.15rem);
  background: linear-gradient(180deg, rgba(7, 94, 159, 0.74), rgba(8, 64, 130, 0.82));
}

.file-icon {
  color: #76e8ff;
  font-size: clamp(1.25rem, 1.25vw, 1.55rem);
  filter: drop-shadow(0 0 0.5rem rgba(74, 221, 255, 0.8));
}

.file-title {
  font-size: clamp(0.8rem, 0.84vw, 1rem);
  font-weight: 700;
}

.file-time {
  margin-top: 0.12rem;
  color: #3fd7ff;
  font-size: clamp(0.66rem, 0.68vw, 0.82rem);
}
</style>

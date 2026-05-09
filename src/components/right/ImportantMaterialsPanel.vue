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
      <div v-for="(file, index) in files" :key="file.title" class="file-card neon-border" :class="{ active_file: index === 0 }">
        <div class="file-icon"><img src="../../assets/word.png" alt="icon"></div>
        <div>
          <div class="file-title">{{ file.title }}</div>
          <div class="file-time">{{ file.updateTime }}</div>
        </div>
      </div>
    </div>
  </BasePanel>
</template>

<script setup lang="ts">
import { number } from 'echarts';
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
  gap: clamp(0.65rem, 1.2vw, 1.3rem);
  margin-bottom: clamp(0.5rem, 0.9vh, 0.7rem);
}

.tabs .badge-button {
  min-width: auto;
  width: 5.2rem;
  height: clamp(1.8rem, 3.2vh, 2.2rem);
  padding: 0;
  border-radius: 0.3rem;
  font-size: clamp(0.75rem, 0.7vw, 0.95rem);
  background-color: #004985;
  font-weight: 500;
}

.tabs .badge-button.active {
  /* background: linear-gradient(180deg, rgba(17, 141, 233, 1), rgba(3, 87, 169, 0.96)); */
  border: 1px solid rgba(33, 177, 255, 0.64);
}

.file-list {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(0.45rem, 0.85vh, 0.6rem);
  height: calc(100% - clamp(1.8rem, 3.2vh, 2.2rem) - clamp(0.5rem, 0.9vh, 0.7rem));
  overflow-y: auto;
}

.file-card {
  flex: 1;
  min-height: clamp(2.6rem, 4.8vh, 3.35rem);
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0 clamp(0.8rem, 1vw, 1.15rem);
  background: #0E2F5C;
}
.neon-border {
  border: none;
  box-shadow: none;
}

.file-icon {
  color: #76e8ff;
  font-size: clamp(1.25rem, 1.25vw, 1.55rem);
  filter: drop-shadow(0 0 0.5rem rgba(74, 221, 255, 0.8));
}

.file-title {
  font-size: clamp(0.8rem, 0.84vw, 0.95rem);
  font-weight: 500;
}

.file-time {
  margin-top: 0.12rem;
  color: #3fd7ff;
  font-size: clamp(0.66rem, 0.6vw, 0.82rem);
}

.active_file{
  background-image: url('../../assets/active_word.png');
  background-size: 100% 100%;
  background-repeat: no-repeat;
}
</style>

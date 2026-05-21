<template>
  <BasePanel title="重要材料" class-name="materials" body-class="materials-body">
    <div class="tabs">
      <button
        v-for="(tab, index) in tabs"
        :key="tab"
        class="badge-button"
        :class="{ active: index === activeTabIndex }"
        type="button"
        @click="activeTabIndex = index"
      >
        {{ tab }}
      </button>
    </div>
    <div class="file-list">
      <div
        v-for="(file, index) in files"
        :key="`${file.title}-${index}`"
        class="file-card neon-border"
        :class="{ active_file: index === activeFileIndex }"
        role="button"
        tabindex="0"
        @click="handlePreview(file, index)"
        @keyup.enter="handlePreview(file, index)"
      >
        <div class="file-icon"><img src="../../assets/word.png" alt="icon"></div>
        <div class="file-info">
          <div class="file-title">{{ file.title }}</div>
          <div class="file-time">{{ file.updateTime }}</div>
        </div>
      </div>
    </div>
  </BasePanel>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { MaterialFile } from '../../types/dashboard'
import BasePanel from '../common/BasePanel.vue'

defineProps<{
  tabs: string[]
  files: MaterialFile[]
}>()

const emit = defineEmits<{
  (e: 'preview', file: MaterialFile): void
}>()

const activeTabIndex = ref(0)
const activeFileIndex = ref(0)

const handlePreview = (file: MaterialFile, index: number) => {
  activeFileIndex.value = index
  emit('preview', file)
}
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
  flex-wrap: wrap;
  gap: clamp(0.45rem, 0.8vw, 0.8rem);
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
  cursor: pointer;
}

.tabs .badge-button.active {
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
  cursor: pointer;
  outline: none;
  transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.file-card:hover {
  background: rgba(16, 70, 132, 0.95);
  transform: translateX(-0.08rem);
}

.file-card:focus-visible {
  box-shadow: 0 0 0 1px rgba(84, 221, 255, 0.86), inset 0 0 1rem rgba(49, 183, 255, 0.18);
}

.neon-border {
  border: none;
  box-shadow: none;
}

.file-icon {
  flex: 0 0 auto;
  color: #76e8ff;
  font-size: clamp(1.25rem, 1.25vw, 1.55rem);
  filter: drop-shadow(0 0 0.5rem rgba(74, 221, 255, 0.8));
}

.file-icon img {
  display: block;
  width: clamp(1.9rem, 1.9vw, 2.25rem);
  height: clamp(1.9rem, 1.9vw, 2.25rem);
}

.file-info {
  min-width: 0;
}

.file-title {
  overflow: hidden;
  color: #eafcff;
  font-size: clamp(0.8rem, 0.84vw, 0.95rem);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-time {
  margin-top: 0.12rem;
  color: #3fd7ff;
  font-size: clamp(0.66rem, 0.6vw, 0.82rem);
}

.active_file {
  background-image: url('../../assets/active_word.png');
  background-size: 100% 100%;
  background-repeat: no-repeat;
}
</style>

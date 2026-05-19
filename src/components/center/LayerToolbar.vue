<template>
  <div class="layer-toolbar">
    <!-- <button class="query neon-border" type="button">
      {{ queryPlaceholder }}
      <span class="search-icon">⌕</span>
    </button> -->
    <div
      v-for="item in items"
      :key="item"
      class="tool-item"
      :class="{ active: item === active }"
    >
      {{ item }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  items: string[]
  active: string
  queryPlaceholder: string
}>()
</script>

<style scoped>
.layer-toolbar {
  position: absolute;
  left: 0;
  top: 42%;
  width: clamp(8.5rem, 10.7vw, 10.2rem);
  display: flex;
  flex-direction: column;
  gap: clamp(0.45rem, 1vh, 0.7rem);
  z-index: 4;
}

.tool-item {
  height: clamp(2.65rem, 4.6vh, 3.4rem);
  color: #e7f8ff;
  font-size: clamp(0.9rem, 0.95vw, 1.15rem);
  font-weight: 500;
  text-align: left;
  background: url('../../assets/pick.png');
  background-repeat: no-repeat;
  background-size: 100% 100%;
  cursor: pointer;
  position: relative;
  padding-left: 30%;
  display: flex;
  align-items: center;
}

.query {
  padding: 0 0.7rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: clamp(0.8rem, 0.84vw, 1rem);
  letter-spacing: 0;
}

.search-icon {
  font-size: clamp(1.25rem, 1.25vw, 1.55rem);
  opacity: 0.9;
}

.active {
  background: url('../../assets/active_pick.png');
  color: #ffc700;
  background-repeat: no-repeat;
  background-size: 100% 100%;
}
</style>

<template>
  <div class="layer-toolbar">
    <button class="query neon-border" type="button">
      {{ queryPlaceholder }}
      <span class="search-icon">⌕</span>
    </button>
    <button
      v-for="item in items"
      :key="item"
      class="tool-item neon-border"
      :class="{ active: item === active }"
      type="button"
    >
      <span class="arrow">›</span>
      {{ item }}
    </button>
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
  top: 4.4%;
  width: clamp(8.5rem, 10.7vw, 10.2rem);
  display: flex;
  flex-direction: column;
  gap: clamp(0.45rem, 1vh, 0.7rem);
  z-index: 4;
}

button {
  height: clamp(2.25rem, 4.1vh, 2.8rem);
  color: #e7f8ff;
  border-radius: 0.2rem;
  font-size: clamp(0.9rem, 0.95vw, 1.15rem);
  font-weight: 800;
  letter-spacing: 0.22em;
  text-align: left;
  background: linear-gradient(90deg, rgba(11, 88, 156, 0.86), rgba(15, 71, 129, 0.74));
  cursor: default;
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

.tool-item {
  position: relative;
  padding-left: 30%;
}

.tool-item::before {
  content: "";
  position: absolute;
  left: 0;
  top: -1px;
  width: 12%;
  height: calc(100% + 2px);
  background: #1ba7e7;
  clip-path: polygon(0 0, 100% 0, 42% 50%, 100% 100%, 0 100%);
}

.tool-item.active {
  color: #ffea36;
  border-color: rgba(255, 211, 40, 0.75);
  background: linear-gradient(90deg, rgba(103, 88, 4, 0.8), rgba(95, 88, 7, 0.72));
  box-shadow: inset 0 0 1.1rem rgba(255, 210, 42, 0.22), 0 0 0.65rem rgba(235, 186, 23, 0.3);
}

.tool-item.active::before {
  background: #f2c700;
}

.arrow {
  position: absolute;
  left: 14%;
  top: 2%;
  font-size: clamp(2rem, 2.1vw, 2.6rem);
  font-weight: 300;
  color: inherit;
}
</style>

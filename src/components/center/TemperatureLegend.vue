<template>
  <div class="legend-wrap">
    <div class="legend-unit">℃</div>
    <div class="legend-bar"></div>
    <div class="legend-labels">
      <span v-for="value in values" :key="value">{{ value }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const values = [36, 34, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2]
</script>

<style scoped>
.legend-wrap {
  position: absolute;
  right: 1.2%;
  top: 21.5%;
  width: clamp(2.6rem, 3.2vw, 3.3rem);
  height: 60%;
  z-index: 6;
}

.legend-unit {
  position: absolute;
  top: -1.5rem;
  left: 42%;
  font-size: clamp(0.85rem, 0.9vw, 1.1rem);
  color: #dff7ff;
  font-weight: 800;
}

.legend-bar {
  position: absolute;
  right: 0;
  top: 0;
  width: 0.75rem;
  height: 100%;
  background: linear-gradient(180deg, #bb132f 0%, #ff7432 26%, #ffd85d 45%, #b7f378 60%, #6bd5f7 78%, #3159ff 100%);
  box-shadow: 0 0 0.5rem rgba(93, 209, 255, 0.45);
}

.legend-labels {
  position: absolute;
  right: 1.15rem;
  top: -0.3rem;
  height: calc(100% + 0.6rem);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: right;
  font-size: clamp(0.68rem, 0.68vw, 0.82rem);
  font-weight: 800;
  color: #f4fbff;
  text-shadow: 0 0 0.25rem #00112c;
}
</style>

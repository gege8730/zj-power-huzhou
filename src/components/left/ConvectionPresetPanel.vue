<template>
  <BasePanel title="预设框" class-name="convection-preset" body-class="convection-preset-body" />
</template>

<script setup lang="ts">
import BasePanel from '../common/BasePanel.vue'
</script>

<style scoped>
.convection-preset {
  flex: 0 0 auto;
  height: clamp(9rem, 20vh, 16rem);
}

.convection-preset :deep(.convection-preset-body) {
  padding: clamp(0.6rem, 1vh, 0.9rem);
}
</style>

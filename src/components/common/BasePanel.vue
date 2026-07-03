<template>
  <section class="panel" :class="className">
    <div v-if="title" class="panel-title">
      <span class="panel-title-text" :data-title="title">{{ title }}</span>
    </div>
    <div class="panel-body custom-scrollbar" :class="bodyClass">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  className?: string
  bodyClass?: string
}>()
</script>

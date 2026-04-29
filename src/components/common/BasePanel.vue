<template>
  <section class="panel" :class="className">
    <div v-if="title" class="panel-title">{{ title }}</div>
    <div class="panel-body" :class="bodyClass">
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

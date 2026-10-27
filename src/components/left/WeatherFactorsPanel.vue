<template>
  <BasePanel title="要素叠加" class-name="weather-factors">
    <div class="factor-list" :class="{ 'is-convection': store.isConvectionMode }">
      <div v-for="(factor, factorIndex) in factors" :key="factor.name" class="factor-row">
        <span class="factor-name">{{ factor.name }}</span>
        <div class="factor-options">
          <span
            v-for="(option, optionIndex) in factor.options"
            :key="option"
            class="factor-option"
            :class="{
              active: store.currentSelection === `${factorIndex}-${optionIndex}`,
              disabled: !store.isConvectionMode && factor.ele[optionIndex] === '',
            }"
            @click="clickFactorOption(factorIndex, optionIndex)"
          >
            {{ option }}
          </span>
        </div>
      </div>
    </div>
  </BasePanel>
</template>

<script setup lang="ts">
import type { FactorConfig } from '@/store'
import BasePanel from '../common/BasePanel.vue'
import { useMapStore } from '@/store' 

defineProps<{
  factors: FactorConfig[]
}>()
// 创建 store 实例
const store = useMapStore()
const clickFactorOption = (factorIndex: number, optionIndex: number) => {
  // 常规场景保持原逻辑：未接数据的选项不可点
  if (!store.isConvectionMode && store.factors[factorIndex]?.ele[optionIndex] === '') return
  store.setFactorOption(factorIndex, optionIndex)
}
</script>

<style scoped>
.weather-factors {
  flex: 0 0 auto;
  min-height: 0;
}

.weather-factors :deep(.panel-body) {
  overflow: visible;
  padding-top: clamp(0.48rem, 0.75vh, 0.7rem);
  padding-bottom: clamp(0.48rem, 0.75vh, 0.7rem);
}

.factor-list {
  height: auto;
  min-height: clamp(12rem, 12vh, 12rem);
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  gap: clamp(0.22rem, 0.52vh, 0.36rem);
}

.factor-row {
  flex: 1;
  min-height: clamp(1.3rem, 2.45vh, 1.75rem);
  display: grid;
  grid-template-columns: minmax(7rem, 20%) 1fr;
  align-items: center;
  padding: 0.14rem clamp(0.55rem, 0.65vw, 0.8rem) 0.18rem clamp(0.55rem, 0.65vw, 0.8rem);
  background: rgba(17, 75, 143, 0.65);
}

.factor-name {
  position: relative;
  padding-left: 1.35rem;
  color: #c3e8f8;
  font-size: clamp(0.82rem, 0.84vw, 1rem);
}

.factor-name::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.25rem;
  width: 0.7rem;
  height: 0.7rem;
  background: radial-gradient(circle, #89eaff 0 24%, #137bd1 29% 62%, rgba(32, 171, 255, 0.26) 66%);
}

.factor-options {
  display: flex;
  justify-content: flex-start;
  gap: clamp(0.45rem, 1vw, 1.25rem);
  align-items: center;
  white-space: nowrap;
}

.factor-option {
  min-width: 2rem;
  padding: 0.1rem 0.45rem;
  color: #ffffff;
  font-size: clamp(0.7rem, 0.74vw, 0.9rem);
  text-align: center;
  cursor: pointer;
}

.factor-option.active {
  background: linear-gradient(90deg, transparent, rgba(39, 119, 245, 0.8), transparent);
  text-shadow: 0 0 0.5rem rgba(96, 213, 255, 0.8);
}

.factor-option.disabled {
  color: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
  pointer-events: none;
}

/* 强对流专题：产品项更多（最多 4 个），行内排布需要更紧凑 */
.factor-list.is-convection .factor-row {
  grid-template-columns: minmax(5.2rem, 18%) 1fr;
  padding-left: clamp(0.4rem, 0.5vw, 0.6rem);
  padding-right: clamp(0.4rem, 0.5vw, 0.6rem);
}

.factor-list.is-convection .factor-name {
  padding-left: 1.1rem;
  white-space: nowrap;
}

.factor-list.is-convection .factor-options {
  gap: clamp(0.25rem, 0.55vw, 0.7rem);
}

.factor-list.is-convection .factor-option {
  min-width: 1.6rem;
  padding: 0.1rem 0.3rem;
}
</style>

<script lang="ts" setup>
import { computed } from 'vue';
import Icon from '../icon/index.vue';

const props = withDefaults(defineProps<{
  modelValue: number;
  totalPage: number;
  /** 显示的页码按钮数量 */
  pagerCount?: number;
}>(), {
  totalPage: 1,
  pagerCount: 7
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
  (e: 'change', value: number): void;
}>();

const change = (page: number) => {
  if (page < 1 || page > props.totalPage || page === props.modelValue) return;
  emit('update:modelValue', page);
  emit('change', page);
};

/** 计算需要展示的页码（含省略号） */
const pages = computed<(number | string)[]>(() => {
  const total = props.totalPage;
  const count = props.pagerCount;
  const cur = props.modelValue;
  if (total <= count) return Array.from({ length: total }, (_, i) => i + 1);
  const half = Math.floor(count / 2);
  let start = Math.max(1, cur - half);
  let end = start + count - 1;
  if (end > total) {
    end = total;
    start = end - count + 1;
  }
  const res: (number | string)[] = [];
  if (start > 1) {
    res.push(1);
    start > 2 && res.push('...');
  }
  for (let i = start; i <= end; i++) res.push(i);
  if (end < total) {
    end < total - 1 && res.push('...');
    res.push(total);
  }
  return res;
});
</script>

<template>
  <div v-if="totalPage > 1" class="rc-pagination">
    <button class="rc-pagination-btn" :disabled="modelValue <= 1" @click="change(modelValue - 1)">
      <Icon name="back" :size="14" />
    </button>
    <template v-for="(p, i) in pages" :key="i">
      <span v-if="p === '...'" class="rc-pagination-ellipsis">···</span>
      <button v-else :class="['rc-pagination-btn', p === modelValue ? 'active' : '']" @click="change(Number(p))">
        {{ p }}
      </button>
    </template>
    <button class="rc-pagination-btn" :disabled="modelValue >= totalPage" @click="change(modelValue + 1)">
      <Icon name="forward" :size="14" />
    </button>
  </div>
</template>

<style scoped lang="scss">
.rc-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}

.rc-pagination-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  border: 1px solid var(--rc-border);
  border-radius: 6px;
  background-color: var(--rc-panel);
  color: var(--rc-text-secondary);
  font-size: 13px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    color: var(--rc-primary);
    border-color: var(--rc-primary);
  }
  &.active {
    background-color: var(--rc-primary);
    border-color: var(--rc-primary);
    color: #fff;
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.rc-pagination-ellipsis {
  color: var(--rc-text-secondary);
  letter-spacing: 1px;
}
</style>

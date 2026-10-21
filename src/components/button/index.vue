<script lang="ts" setup>
import { computed } from 'vue';
import Icon from '../icon/index.vue';

const props = withDefaults(defineProps<{
  type?: 'default' | 'primary' | 'danger' | 'text';
  size?: 'small' | 'default';
  icon?: string;
  disabled?: boolean;
  /** 是否处于激活（选中）状态 */
  active?: boolean;
}>(), {
  type: 'default',
  size: 'default',
  disabled: false,
  active: false
});

defineEmits<{
  (e: 'click'): void;
}>();

const cls = computed(() =>
  [
    'rc-btn',
    `rc-btn-${props.type}`,
    props.size === 'small' ? 'rc-btn-small' : '',
    props.active ? 'rc-btn-active' : ''
  ].filter(Boolean)
);
</script>

<template>
  <button :class="cls" :disabled="disabled" @click="!disabled && $emit('click')">
    <Icon v-if="icon" :name="icon" :size="size === 'small' ? 14 : 15" />
    <slot />
  </button>
</template>

<style scoped lang="scss">
.rc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--rc-border);
  border-radius: 6px;
  background-color: var(--rc-panel);
  color: var(--rc-text);
  font-size: 13.5px;
  white-space: nowrap;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: var(--rc-primary);
    color: var(--rc-primary);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.rc-btn-small {
    height: 28px;
    padding: 0 10px;
    font-size: 13px;
  }

  &.rc-btn-primary {
    background-color: var(--rc-primary);
    border-color: var(--rc-primary);
    color: #fff;
    &:hover:not(:disabled) {
      filter: brightness(1.08);
      color: #fff;
    }
    &.rc-btn-active {
      filter: brightness(0.9);
    }
  }

  &.rc-btn-danger {
    color: var(--rc-danger);
    border-color: var(--rc-danger);
    &:hover:not(:disabled) {
      background-color: var(--rc-danger);
      color: #fff;
    }
  }

  &.rc-btn-text {
    padding: 0 8px;
    border-color: transparent;
    background-color: transparent;
    color: var(--rc-text-secondary);
    &:hover:not(:disabled) {
      background-color: var(--rc-hover);
      color: var(--rc-primary);
      border-color: transparent;
    }
  }

  &.rc-btn-active:not(.rc-btn-primary) {
    border-color: var(--rc-primary);
    color: var(--rc-primary);
    background-color: rgba(30, 120, 235, 0.08);
  }
}
</style>

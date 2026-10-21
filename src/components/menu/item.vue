<script lang="ts" setup>
import { inject } from 'vue';

const props = defineProps<{
  label?: string;
  divider?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const close = inject<() => void>('rc-menu-close', () => void 0);

const onClick = () => {
  if (props.disabled) return;
  emit('click');
  close();
};
</script>

<template>
  <div v-if="divider" class="rc-menu-divider" />
  <button v-else :class="['rc-menu-item', disabled ? 'disabled' : '']" @click="onClick">
    <slot>{{ label }}</slot>
  </button>
</template>

<style scoped lang="scss">
.rc-menu-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border-radius: 5px;
  text-align: left;
  color: var(--rc-text);
  font-size: 13.5px;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover {
    background-color: var(--rc-hover);
    color: var(--rc-primary);
  }
  &.disabled {
    color: var(--rc-text-secondary);
    cursor: not-allowed;
    &:hover {
      background-color: transparent;
      color: var(--rc-text-secondary);
    }
  }
}

.rc-menu-divider {
  height: 1px;
  margin: 5px 4px;
  background-color: var(--rc-border);
}
</style>

<script lang="ts" setup>
import { computed } from 'vue';
import Icon from '../icon/index.vue';

const props = withDefaults(defineProps<{
  modelValue: string;
  placeholder?: string;
  clearable?: boolean;
  width?: string;
}>(), {
  placeholder: '搜索',
  clearable: true,
  width: '220px'
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'enter', value: string): void;
}>();

const val = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
});

const clear = () => emit('update:modelValue', '');
</script>

<template>
  <div class="rc-search-input" :style="{ width }">
    <Icon name="search" :size="15" class="rc-search-icon" />
    <input
      v-model="val"
      class="rc-search-field"
      type="text"
      :placeholder="placeholder"
      @keyup.enter="emit('enter', val)"
    />
    <button v-if="clearable && val" class="rc-search-clear" title="清空" @click="clear">
      <Icon name="close-circle" :size="14" />
    </button>
  </div>
</template>

<style scoped lang="scss">
.rc-search-input {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--rc-border);
  border-radius: 6px;
  background-color: var(--rc-panel);
  transition: border-color 0.2s ease;

  &:focus-within {
    border-color: var(--rc-primary);
  }
}

.rc-search-icon {
  color: var(--rc-text-secondary);
}

.rc-search-field {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  color: var(--rc-text);
  user-select: text;

  &::placeholder {
    color: var(--rc-text-secondary);
  }
}

.rc-search-clear {
  display: flex;
  align-items: center;
  color: var(--rc-text-secondary);
  transition: color 0.2s ease;

  &:hover {
    color: var(--rc-danger);
  }
}
</style>

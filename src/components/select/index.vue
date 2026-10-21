<script lang="ts" setup generic="T extends string | number">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import Icon from '../icon/index.vue';

type Option = {
  label: string;
  value: T;
  /** 副标题（如规则示例） */
  description?: string;
  disabled?: boolean;
};

const props = withDefaults(defineProps<{
  modelValue: T;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
}>(), {
  placeholder: '请选择',
  disabled: false
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: T): void;
  (e: 'change', value: T): void;
}>();

const triggerEl = ref<HTMLElement | null>(null);
const panelEl = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const panelStyle = ref<Record<string, string>>({});

const current = computed(() => props.options.find(o => o.value === props.modelValue));

/** 面板采用 fixed 定位，避免被对话框的滚动容器裁剪 */
const updatePosition = () => {
  const el = triggerEl.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const gap = 4;
  const spaceBelow = window.innerHeight - rect.bottom - gap - 12;
  const spaceAbove = rect.top - gap - 12;
  const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
  panelStyle.value = {
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${Math.min(280, openUp ? spaceAbove : spaceBelow)}px`,
    ...(openUp
      ? { bottom: `${window.innerHeight - rect.top + gap}px` }
      : { top: `${rect.bottom + gap}px` })
  };
};

const onDocumentMouseDown = (e: MouseEvent) => {
  const target = e.target as Node;
  if (triggerEl.value?.contains(target) || panelEl.value?.contains(target)) return;
  close();
};

const close = () => {
  if (!isOpen.value) return;
  isOpen.value = false;
  document.removeEventListener('mousedown', onDocumentMouseDown, true);
  window.removeEventListener('resize', close);
  window.removeEventListener('scroll', close, true);
};

const open = async () => {
  if (props.disabled || isOpen.value) return;
  isOpen.value = true;
  await nextTick();
  updatePosition();
  document.addEventListener('mousedown', onDocumentMouseDown, true);
  window.addEventListener('resize', close);
  window.addEventListener('scroll', close, true);
};

const toggle = () => (isOpen.value ? close() : open());

const select = (option: Option) => {
  if (option.disabled) return;
  emit('update:modelValue', option.value);
  emit('change', option.value);
  close();
};

onBeforeUnmount(close);
</script>

<template>
  <div :class="['rc-select', isOpen ? 'is-open' : '', disabled ? 'is-disabled' : '']">
    <button ref="triggerEl" type="button" class="rc-select-trigger" :disabled="disabled" @click="toggle">
      <span v-if="current" class="rc-select-value rc-ellipsis">{{ current.label }}</span>
      <span v-else class="rc-select-placeholder rc-ellipsis">{{ placeholder }}</span>
      <Icon name="down" :size="13" class="rc-select-caret" />
    </button>

    <Teleport to="body">
      <Transition name="rc-select-fade">
        <div v-if="isOpen" ref="panelEl" class="rc-select-panel rc-scrollbar" :style="panelStyle">
          <button v-for="option in options" :key="option.value" type="button" :class="[
              'rc-select-option',
              option.value === modelValue ? 'is-selected' : '',
              option.disabled ? 'is-disabled' : ''
            ]" @click="select(option)">
            <span class="rc-select-option-main">
              <span class="rc-select-option-label rc-ellipsis">{{ option.label }}</span>
              <span v-if="option.description" class="rc-select-option-desc rc-ellipsis">{{ option.description }}</span>
            </span>
            <Icon v-if="option.value === modelValue" name="check" :size="14" class="rc-select-option-check" />
          </button>
          <p v-if="options.length === 0" class="rc-select-empty">暂无可选项</p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.rc-select {
  position: relative;
  flex: 1;
  min-width: 120px;
}

.rc-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--rc-border);
  border-radius: 6px;
  background-color: var(--rc-panel);
  color: var(--rc-text);
  font-size: 13px;
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover:not(:disabled) {
    border-color: var(--rc-primary);
  }

  .rc-select-value,
  .rc-select-placeholder {
    min-width: 0;
  }
  .rc-select-placeholder {
    color: var(--rc-text-secondary);
  }
  .rc-select-caret {
    flex-shrink: 0;
    color: var(--rc-text-secondary);
    transition: transform 0.2s ease;
  }
}

.rc-select.is-open .rc-select-trigger {
  border-color: var(--rc-primary);
  box-shadow: 0 0 0 2px rgba(30, 120, 235, 0.12);

  .rc-select-caret {
    transform: rotate(180deg);
    color: var(--rc-primary);
  }
}

.rc-select.is-disabled .rc-select-trigger {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

<style lang="scss">
.rc-select-panel {
  position: fixed;
  z-index: 2600;
  padding: 4px;
  border: 1px solid var(--rc-border);
  border-radius: 8px;
  background-color: var(--rc-panel);
  box-shadow: var(--rc-shadow);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.rc-select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 7px 9px;
  border-radius: 6px;
  color: var(--rc-text);
  font-size: 13px;
  text-align: left;
  transition: background-color 0.15s ease;

  &:hover,
  &.is-selected {
    background-color: var(--rc-hover);
  }

  &.is-selected {
    color: var(--rc-primary);
    font-weight: 600;
  }

  &.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.rc-select-option-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.rc-select-option-label {
  font-size: 13px;
}

.rc-select-option-desc {
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--rc-text-secondary);
}

.rc-select-option-check {
  flex-shrink: 0;
}

.rc-select-empty {
  padding: 10px;
  color: var(--rc-text-secondary);
  font-size: 12.5px;
  text-align: center;
}

.rc-select-fade-enter-active,
.rc-select-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
  transform-origin: top center;
}
.rc-select-fade-enter-from,
.rc-select-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

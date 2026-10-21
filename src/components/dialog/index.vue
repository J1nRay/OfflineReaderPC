<script lang="ts" setup>
import { watch } from 'vue';
import Icon from '../icon/index.vue';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  title?: string;
  width?: string;
  confirmText?: string;
  cancelText?: string;
  showFooter?: boolean;
  closeOnClickModal?: boolean;
}>(), {
  title: '提示',
  width: '420px',
  confirmText: '确定',
  cancelText: '取消',
  showFooter: true,
  closeOnClickModal: true
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'close'): void;
}>();

const close = () => {
  emit('update:modelValue', false);
  emit('close');
};

const onCancel = () => {
  emit('cancel');
  close();
};

const onModalClick = () => {
  props.closeOnClickModal && onCancel();
};

watch(() => props.modelValue, v => {
  document.body.style.overflow = v ? 'hidden' : '';
});
</script>

<template>
  <Teleport to="body">
    <Transition name="rc-fade">
      <div v-if="modelValue" class="rc-dialog-mask" @click.self="onModalClick">
        <div class="rc-dialog" :style="{ width }">
          <header class="rc-dialog-header">
            <h3 class="rc-dialog-title">{{ title }}</h3>
            <button class="rc-dialog-close" title="关闭" @click="onCancel">
              <Icon name="close" :size="15" />
            </button>
          </header>
          <div class="rc-dialog-body rc-scrollbar">
            <slot />
          </div>
          <footer v-if="showFooter" class="rc-dialog-footer">
            <slot name="footer">
              <button class="rc-btn" @click="onCancel">{{ cancelText }}</button>
              <button class="rc-btn primary" @click="emit('confirm')">{{ confirmText }}</button>
            </slot>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.rc-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2400;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.35);
  padding: 30px;
}

.rc-dialog {
  display: flex;
  flex-direction: column;
  max-width: 100%;
  max-height: 100%;
  border-radius: 10px;
  background-color: var(--rc-panel);
  box-shadow: var(--rc-shadow);
  overflow: hidden;
}

.rc-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--rc-border);

  .rc-dialog-title {
    font-size: 15px;
    font-weight: 600;
  }
}

.rc-dialog-close {
  display: flex;
  align-items: center;
  color: var(--rc-text-secondary);
  transition: color 0.2s ease;

  &:hover {
    color: var(--rc-danger);
  }
}

.rc-dialog-body {
  flex: 1;
  padding: 16px 18px;
  overflow-y: auto;
}

.rc-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid var(--rc-border);
}

.rc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--rc-border);
  border-radius: 6px;
  background-color: var(--rc-panel);
  color: var(--rc-text);
  font-size: 13.5px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: var(--rc-primary);
    color: var(--rc-primary);
  }

  &.primary {
    background-color: var(--rc-primary);
    border-color: var(--rc-primary);
    color: #fff;
    &:hover:not(:disabled) {
      filter: brightness(1.08);
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>

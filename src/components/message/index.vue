<script lang="ts" setup>
import { useMessageState } from '../../hooks/message';
import Icon from '../icon/index.vue';
import type { MessageType } from '../../hooks/message';

const state = useMessageState();

const ICON_NAME: Record<MessageType, string> = {
  success: 'check-circle',
  warning: 'warning',
  error: 'close-circle',
  info: 'info'
};
</script>

<template>
  <Teleport to="body">
    <div class="rc-message-container">
      <TransitionGroup name="rc-message">
        <div v-for="m in state.messages" :key="m.id" :class="['rc-message', m.type]">
          <Icon :name="ICON_NAME[m.type]" :size="16" />
          <span class="rc-message-text">{{ m.text }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.rc-message-container {
  position: fixed;
  top: 16px;
  left: 50%;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transform: translateX(-50%);
  pointer-events: none;
}

.rc-message {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 460px;
  padding: 10px 16px;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-radius);
  background-color: var(--rc-panel);
  box-shadow: var(--rc-shadow);
  font-size: 13.5px;
  pointer-events: auto;

  .rc-message-text {
    line-height: 1.5;
    word-break: break-all;
  }

  &.success {
    color: var(--rc-success);
  }
  &.warning {
    color: var(--rc-warning);
  }
  &.error {
    color: var(--rc-danger);
  }
  &.info {
    color: var(--rc-primary);
  }
}

.rc-message-enter-active,
.rc-message-leave-active {
  transition: all 0.28s ease;
}
.rc-message-enter-from,
.rc-message-leave-to {
  opacity: 0;
  transform: translateY(-14px);
}
.rc-message-move {
  transition: transform 0.28s ease;
}
</style>

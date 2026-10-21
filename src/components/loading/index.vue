<script lang="ts" setup>
withDefaults(defineProps<{
  loading?: boolean;
  text?: string;
  /** 全屏遮罩 */
  fullscreen?: boolean;
}>(), {
  loading: false,
  text: '加载中',
  fullscreen: false
});
</script>

<template>
  <Transition name="rc-fade">
    <div v-if="loading" :class="['rc-loading-mask', fullscreen ? 'fullscreen' : '']">
      <div class="rc-loading-box">
        <div class="rc-spinner">
          <span></span>
          <span></span>
        </div>
        <p v-if="text" class="rc-loading-text">{{ text }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.rc-loading-mask {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--rc-bg);
  opacity: 0.92;

  &.fullscreen {
    position: fixed;
    z-index: 2600;
  }
}

.rc-loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.rc-spinner {
  position: relative;
  width: 54px;
  height: 54px;
  color: var(--rc-primary);

  span {
    position: absolute;
    inset: 0;
    border: 3px solid currentColor;
    border-radius: 50%;
    opacity: 1;
    animation: rc-ripple 1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
  }
  span:nth-child(2) {
    animation-delay: -0.5s;
  }
}

.rc-loading-text {
  font-size: 13px;
  color: var(--rc-text-secondary);
}

@keyframes rc-ripple {
  0% {
    transform: scale(0.12);
    opacity: 0;
  }
  5% {
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}
</style>

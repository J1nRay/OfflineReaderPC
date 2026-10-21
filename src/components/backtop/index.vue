<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useScrollTopStore } from '../../store/scrolltop';
import Icon from '../icon/index.vue';

const props = withDefaults(defineProps<{
  /** 显示阈值（滚动超过该值后出现） */
  threshold?: number;
}>(), {
  threshold: 400
});

const scrollTopStore = useScrollTopStore();
const visible = ref(false);

const onScroll = () => {
  const el = scrollTopStore.mainElement;
  visible.value = !!el && el.scrollTop > props.threshold;
};

onMounted(() => {
  scrollTopStore.mainElement?.addEventListener('scroll', onScroll);
});
onUnmounted(() => {
  scrollTopStore.mainElement?.removeEventListener('scroll', onScroll);
});

const toTop = () => scrollTopStore.scrollTop(0, 'smooth');
</script>

<template>
  <Transition name="rc-backtop">
    <button v-if="visible" class="rc-backtop" title="回到顶部" @click="toTop">
      <Icon name="up" :size="18" />
    </button>
  </Transition>
</template>

<style scoped lang="scss">
.rc-backtop {
  position: fixed;
  right: 26px;
  bottom: 30px;
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--rc-border);
  border-radius: 50%;
  background-color: var(--rc-panel);
  color: var(--rc-text-secondary);
  box-shadow: var(--rc-shadow);
  transition: all 0.2s ease;

  &:hover {
    color: var(--rc-primary);
    border-color: var(--rc-primary);
  }
}

.rc-backtop-enter-active,
.rc-backtop-leave-active {
  transition: all 0.25s ease;
}
.rc-backtop-enter-from,
.rc-backtop-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>

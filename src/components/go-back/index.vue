<script lang="ts" setup>
import { useRouter } from 'vue-router';
import Icon from '../icon/index.vue';

const props = withDefaults(defineProps<{
  label?: string;
  to?: string;
}>(), {
  label: '返回'
});

const router = useRouter();

const goBack = () => {
  if (props.to) {
    router.push(props.to);
  } else {
    router.back();
  }
};
</script>

<template>
  <button class="rc-go-back" @click="goBack">
    <Icon name="back" :size="16" />
    <span>{{ label }}</span>
  </button>
</template>

<style scoped lang="scss">
.rc-go-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px 0 9px;
  border: 1px solid var(--rc-border);
  border-radius: 6px;
  background-color: var(--rc-panel);
  color: var(--rc-text-secondary);
  transition: all 0.2s ease;

  &:hover {
    color: var(--rc-primary);
    border-color: var(--rc-primary);
  }
}
</style>

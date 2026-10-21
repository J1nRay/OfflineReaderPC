<script lang="ts" setup>
const props = withDefaults(defineProps<{
  ellipsis?: boolean;
  maxWidth?: number | string;
  hover?: boolean;
  cursor?: 'default' | 'pointer' | 'text';
}>(), {
  ellipsis: false,
  hover: false
});
</script>

<template>
  <span
    :class="['rc-text', props.ellipsis ? 'rc-text-ellipsis' : '', props.hover ? 'rc-text-hover' : '']"
    :style="{ maxWidth: props.maxWidth || '', cursor: props.cursor || '' }"
  >
    <slot />
  </span>
</template>

<style scoped lang="scss">
.rc-text.rc-text-ellipsis {
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  line-height: calc(100% + 5px);
}
.rc-text.rc-text-hover {
  transition: color 0.3s ease;
  &:hover {
    color: var(--rc-primary);
  }
}
</style>

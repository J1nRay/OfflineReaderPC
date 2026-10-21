<script lang="ts" setup>
import { nextTick, onMounted, onUnmounted, provide, ref } from 'vue';

const props = withDefaults(defineProps<{
  /** 触发右键菜单的选择器（如 "#main"） */
  trigger: string;
  disabled?: boolean;
}>(), {
  disabled: false
});

const visible = ref(false);
const pos = ref({ left: '0px', top: '0px' });
const menuRef = ref<HTMLElement | null>(null);

const close = () => {
  visible.value = false;
};
provide('rc-menu-close', close);

const onContextMenu = (e: MouseEvent) => {
  if (props.disabled) return;
  const target = e.target as Element | null;
  if (!target || !target.closest(props.trigger)) return;
  e.preventDefault();
  pos.value = { left: '-9999px', top: '-9999px' };
  visible.value = true;
  nextTick(() => {
    const el = menuRef.value;
    const w = el?.offsetWidth || 150;
    const h = el?.offsetHeight || 120;
    const x = Math.max(6, Math.min(e.clientX, window.innerWidth - w - 8));
    const y = Math.max(6, Math.min(e.clientY, window.innerHeight - h - 8));
    pos.value = { left: `${x}px`, top: `${y}px` };
  });
};

const onDocClick = () => close();
const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && close();

onMounted(() => {
  document.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('blur', close);
});
onUnmounted(() => {
  document.removeEventListener('contextmenu', onContextMenu);
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('blur', close);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="rc-menu">
      <div v-if="visible" ref="menuRef" class="rc-menu" :style="pos" @click.stop>
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.rc-menu {
  position: fixed;
  z-index: 2500;
  min-width: 140px;
  padding: 5px;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-radius);
  background-color: var(--rc-panel);
  box-shadow: var(--rc-shadow);
}

.rc-menu-enter-active,
.rc-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.rc-menu-enter-from,
.rc-menu-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>

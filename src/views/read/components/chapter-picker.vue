<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';
import Icon from '../../../components/icon/index.vue';
import type { Chapter } from '../../../core/book/book';

const props = defineProps<{
  visible: boolean;
  chapters: Chapter[];
  currentIndex: number;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'select', index: number): void;
}>();

/** 目录最多渲染的章节数，超出时通过序号跳转 */
const MAX_RENDER = 500;

const jumpValue = ref('1');
const filter = ref('');
const listRef = ref<HTMLElement>();

const close = () => emit('update:visible', false);

const matched = computed(() => {
  const keyword = filter.value.trim();
  return props.chapters
    .map((chapter, index) => ({ chapter, index }))
    .filter(v => !keyword || v.chapter.title.includes(keyword));
});

const items = computed(() => matched.value.slice(0, MAX_RENDER));
const truncated = computed(() => matched.value.length > MAX_RENDER);

const scrollToCurrent = () => {
  const active = listRef.value?.querySelector<HTMLElement>('.cp-item.active');
  active?.scrollIntoView({ block: 'center' });
};

watch(
  () => props.visible,
  visible => {
    if (!visible) return;
    filter.value = '';
    jumpValue.value = String(props.currentIndex + 1);
    nextTick(scrollToCurrent);
  }
);

watch(filter, () => nextTick(scrollToCurrent));

const select = (index: number) => {
  emit('select', index);
  close();
};

const jump = () => {
  const value = Number(jumpValue.value);
  if (!Number.isInteger(value) || value < 1 || value > props.chapters.length) {
    jumpValue.value = String(props.currentIndex + 1);
    return;
  }
  select(value - 1);
};
</script>

<template>
  <Transition name="cp-pop">
    <div v-if="visible" class="chapter-picker">
      <header class="cp-header">
        <span>章节目录</span>
        <button class="cp-close" title="关闭" @click="close">
          <Icon name="close" :size="14" />
        </button>
      </header>

      <div class="cp-jump">
        <span class="cp-jump-label">跳转到</span>
        <input v-model="jumpValue" class="rc-input cp-jump-input" type="number" :min="1" :max="chapters.length" @keydown.enter="jump" />
        <span class="cp-jump-total">/ {{ chapters.length }} 章</span>
        <button class="cp-jump-btn" @click="jump">跳转</button>
      </div>

      <input v-model="filter" class="rc-input cp-filter" placeholder="搜索章节标题" />

      <div ref="listRef" class="cp-list rc-scrollbar">
        <button
          v-for="v in items"
          :key="v.index"
          :class="['cp-item', v.index === currentIndex ? 'active' : '']"
          @click="select(v.index)"
        >
          <span class="cp-item-index">{{ v.index + 1 }}</span>
          <span class="cp-item-title rc-ellipsis">{{ v.chapter.title }}</span>
        </button>
        <p v-if="items.length < 1" class="cp-empty">未找到章节</p>
        <p v-else-if="truncated" class="cp-empty">仅显示前 {{ MAX_RENDER }} 章，可输入序号直接跳转</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.chapter-picker {
  position: fixed;
  bottom: 72px;
  left: 50%;
  z-index: 2001;
  display: flex;
  flex-direction: column;
  width: 360px;
  max-height: 54vh;
  padding: 10px 12px 12px;
  border: 1px solid var(--rc-border);
  border-radius: 12px;
  background-color: var(--rc-panel);
  box-shadow: var(--rc-shadow);
  transform: translateX(-50%);
}

.cp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
}

.cp-close {
  display: flex;
  align-items: center;
  color: var(--rc-text-secondary);
  &:hover {
    color: var(--rc-danger);
  }
}

.cp-jump {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.cp-jump-label {
  font-size: 12.5px;
  color: var(--rc-text-secondary);
  white-space: nowrap;
}

.cp-jump-input {
  width: 70px;
  height: 28px;
  padding: 0 8px;
  text-align: center;
}

.cp-jump-total {
  flex: 1;
  font-size: 12px;
  color: var(--rc-text-secondary);
  white-space: nowrap;
}

.cp-jump-btn {
  height: 28px;
  padding: 0 12px;
  border-radius: 6px;
  background-color: var(--rc-primary);
  color: #fff;
  font-size: 12.5px;
  white-space: nowrap;
}

.cp-filter {
  width: 100%;
  height: 30px;
  margin-bottom: 8px;
  padding: 0 10px;
}

.cp-list {
  flex: 1;
  min-height: 80px;
  overflow-y: auto;
  border-top: 1px solid var(--rc-border);
  padding-top: 6px;
}

.cp-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 8px;
  border-radius: 6px;
  font-size: 12.5px;
  color: var(--rc-text);
  text-align: left;

  &:hover {
    background-color: var(--rc-hover);
  }

  &.active {
    color: var(--rc-primary);
    background-color: var(--rc-hover);
  }
}

.cp-item-index {
  flex-shrink: 0;
  width: 40px;
  color: var(--rc-text-secondary);
  text-align: right;
}

.cp-item-title {
  flex: 1;
  min-width: 0;
}

.cp-empty {
  padding: 16px 0;
  font-size: 12px;
  color: var(--rc-text-secondary);
  text-align: center;
}

.cp-pop-enter-active,
.cp-pop-leave-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.cp-pop-enter-from,
.cp-pop-leave-to {
  transform: translateX(-50%) translateY(8px);
  opacity: 0;
}
</style>

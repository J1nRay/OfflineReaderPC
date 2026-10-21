<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { PagePath } from '../../core/window';
import { Font } from '../../core/font';
import { DefaultReadColor } from '../../core/window/default-read-style';
import { useMessage } from '../../hooks/message';
import { useShortcutKey } from '../../hooks/shortcut-key';
import { errorHandler } from '../../core/utils';
import { useDetailStore } from '../../store/detail';
import { useTextContentStore, type TextContent } from '../../store/text-content';
import { useSettingsStore } from '../../store/settings';
import { useWindowStore } from '../../store/window';
import { useScrollTopStore } from '../../store/scrolltop';
import { useBookmarkStore } from '../../store/bookmark';
import { useBookmarks } from './hooks/bookmarks';
import { useScrollTop } from './hooks/scrolltop';
import ReadSettings from './components/read-settings.vue';
import BookmarkPanel from './components/bookmark-panel.vue';
import ChapterPicker from './components/chapter-picker.vue';
import Icon from '../../components/icon/index.vue';
import Dialog from '../../components/dialog/index.vue';
import Menu from '../../components/menu/index.vue';
import MenuItem from '../../components/menu/item.vue';
import type { Chapter } from '../../core/book/book';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const pid = String(route.query.pid || '');
const detailUrl = String(route.query.detailUrl || '');

const detail = useDetailStore();
const textContentStore = useTextContentStore();
const settings = useSettingsStore();
const windowStore = useWindowStore();
const scrollTopStore = useScrollTopStore();
const bookmarkStore = useBookmarkStore();

const { currentChapter, isRunningGetTextContent } = storeToRefs(textContentStore);
const { readProgress, isDark } = storeToRefs(windowStore);
const { bookmarks } = storeToRefs(bookmarkStore);
const {
  backgroundColor, textColor, fontSize, fontWeight, letterSpacing,
  fontFamily, sectionSpacing, lineSpacing, width,
  bookmarkColorEven, bookmarkColorOdd
} = storeToRefs(settings);

const {
  options, renderChapter, setBookmark,
  promptVisible, promptTitle, promptNote, cancelSetBookmark, confirmSetBookmark,
  detailVisible, detailTitle, detailNote, detailTime
} = useBookmarks();

const panelVisible = ref(false);
const bookmarkPanelVisible = ref(false);
const chapterPickerVisible = ref(false);
const toggling = ref(false);

/** 面板互斥打开 */
const togglePanel = (target: 'settings' | 'bookmark' | 'chapter') => {
  const next = {
    settings: target === 'settings' ? !panelVisible.value : false,
    bookmark: target === 'bookmark' ? !bookmarkPanelVisible.value : false,
    chapter: target === 'chapter' ? !chapterPickerVisible.value : false
  };
  panelVisible.value = next.settings;
  bookmarkPanelVisible.value = next.bookmark;
  chapterPickerVisible.value = next.chapter;
};

const closePanels = () => {
  panelVisible.value = false;
  bookmarkPanelVisible.value = false;
  chapterPickerVisible.value = false;
};

const chapterList = computed(() => detail.detailResult?.chapterList || []);
const canPrev = computed(() => detail.currentReadIndex > 0);
const canNext = computed(() => detail.currentReadIndex < chapterList.value.length - 1);

const chapterStyle = computed(() => ({
  width: width.value,
  fontSize: fontSize.value,
  fontWeight: fontWeight.value,
  letterSpacing: letterSpacing.value,
  lineHeight: lineSpacing.value,
  color: textColor.value,
  '--rc-section-spacing': sectionSpacing.value,
  '--rc-bookmark-odd-color': bookmarkColorOdd.value,
  '--rc-bookmark-even-color': bookmarkColorEven.value,
  '--rc-font-family': fontFamily.value === '' ? Font.default.family : fontFamily.value
}));

/** 连续阅读：正文中同时渲染多个章节，滚动到底部时无缝追加下一章 */
type FlowChapter = { chapter: Chapter; data: TextContent };
const flow = ref<FlowChapter[]>([]);
const loadingAdjacent = ref(false);
const trimming = ref(false);

const contents = computed(() => {
  // 依赖书签数据，书签变更时重新渲染正文
  void bookmarks.value.length;
  return flow.value
    .map(seg => `<div class="chapter-block" data-chapter-index="${seg.chapter.index}">${renderChapter(seg.chapter, seg.data)}</div>`)
    .join('');
});

const mainElement = () => scrollTopStore.mainElement;

const chapterBlocks = () =>
  Array.from(mainElement()?.querySelectorAll<HTMLElement>('.chapter-block') || []);

/** 更新阅读进度：按整本或按当前章节计算 */
const updateReadProgress = () => {
  const el = mainElement();
  if (!el) return;
  if (!options.value.enableChapterProgress) {
    windowStore.calcReadProgress(el);
    return;
  }
  const blocks = chapterBlocks();
  if (blocks.length < 1) {
    windowStore.readProgress = 0;
    return;
  }
  let active = blocks[0];
  for (const block of blocks) {
    if (block.offsetTop <= el.scrollTop + 2) active = block;
  }
  const height = active.offsetHeight || 1;
  const value = Math.round(((el.scrollTop - active.offsetTop) / height) * 100);
  windowStore.readProgress = Math.min(100, Math.max(0, value));
};

/** 根据滚动位置同步当前正在阅读的章节 */
const syncActiveChapter = () => {
  const el = mainElement();
  if (!el) return;
  const blocks = chapterBlocks();
  if (blocks.length < 1) return;
  const probe = el.scrollTop + el.clientHeight * 0.4;
  let active = blocks[0];
  for (const block of blocks) {
    if (block.offsetTop <= probe) active = block;
  }
  const index = Number(active.dataset.chapterIndex);
  const seg = flow.value.find(v => v.chapter.index === index);
  if (!seg || currentChapter.value?.index === index) return;
  textContentStore.currentChapter = seg.chapter;
  detail.setCurrentReadIndex(index);
  updateReadProgress();
  trimFlow();
};

/** 剪掉当前章节之前过多的内容，避免正文无限增长（保留上一章便于回看） */
const trimFlow = async () => {
  if (trimming.value) return;
  const activeIndex = detail.currentReadIndex;
  const activePos = flow.value.findIndex(v => v.chapter.index === activeIndex);
  if (activePos <= 1) return;
  const el = mainElement();
  if (!el) return;
  const anchor = el.querySelector<HTMLElement>(`[data-chapter-index="${activeIndex}"]`);
  const before = anchor?.getBoundingClientRect().top;
  if (before === undefined) return;
  trimming.value = true;
  try {
    flow.value = flow.value.slice(activePos - 1);
    await nextTick();
    const anchorAfter = el.querySelector<HTMLElement>(`[data-chapter-index="${activeIndex}"]`);
    if (anchorAfter) el.scrollTop += anchorAfter.getBoundingClientRect().top - before;
  } finally {
    trimming.value = false;
  }
};

/** 接近底部时预加载并追加下一章 */
const maybeLoadNext = async () => {
  if (!options.value.enableScrollToggleChapter || loadingAdjacent.value || isRunningGetTextContent.value) return;
  const el = mainElement();
  if (!el) return;
  const remaining = el.scrollHeight - el.clientHeight - el.scrollTop;
  if (remaining > el.clientHeight * 1.2) return;
  const last = flow.value[flow.value.length - 1];
  if (!last) return;
  const next = chapterList.value[last.chapter.index + 1];
  if (!next) return;
  loadingAdjacent.value = true;
  try {
    const data = await textContentStore.fetchTextContent(pid, next);
    if (!data) return;
    // 加载期间可能已切换章节，避免重复追加
    if (flow.value[flow.value.length - 1]?.chapter.index !== last.chapter.index) return;
    flow.value = [...flow.value, { chapter: next, data }];
    await nextTick();
  } finally {
    loadingAdjacent.value = false;
  }
};

/* 初始化：载入当前章节 */
const init = async () => {
  const index = Number(route.query.index ?? -1);
  await detail.setBook(pid, detailUrl);
  if (detail.error) {
    message.error(detail.error);
    return;
  }
  const list = chapterList.value;
  if (list.length < 1) {
    message.warning('本书没有可用章节');
    return;
  }
  const bookIndex = detail.currentReadIndex;
  const bookScrollTop = detail.currentReadScrollTop.scrollTop;
  const target = index >= 0 && index < list.length ? index : bookIndex >= 0 ? bookIndex : 0;
  detail.currentReadScrollTop = {
    chapterIndex: target,
    scrollTop: target === bookIndex ? bookScrollTop : 0
  };
  await textContentStore.getTextContent(pid, list[target]);
  detail.setCurrentReadIndex(target);
};

onMounted(init);

useScrollTop(pid, detailUrl);

/* 当前章节变化时重置连续阅读的内容 */
watch(
  () => textContentStore.textContent,
  value => {
    if (!value || !currentChapter.value) return;
    flow.value = [{ chapter: currentChapter.value, data: value }];
    if (options.value.enableChapterProgress) windowStore.readProgress = 0;
    nextTick(() => {
      syncActiveChapter();
      updateReadProgress();
      maybeLoadNext();
    });
  }
);

/* 滚动时同步章节并提前加载下一章 */
let scrollRaf = 0;
const onContentScroll = () => {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    syncActiveChapter();
    updateReadProgress();
    maybeLoadNext();
  });
};

/* 滚动到正文顶部切换上一章（下一章已由连续加载处理） */
const onScrollEnd = (e: Event) => {
  if (!options.value.enableScrollToggleChapter || toggling.value || isRunningGetTextContent.value) return;
  const el = e.target as HTMLElement;
  if (el.scrollTop > 2 || !canPrev.value) return;
  if (scrollTopStore.textContentOffsetTop() <= 2) return;
  toggling.value = true;
  textContentStore.prevChapter(true).finally(() => setTimeout(() => (toggling.value = false), 700));
};

onMounted(() => {
  mainElement()?.addEventListener('scroll', onContentScroll, { passive: true });
  mainElement()?.addEventListener('scrollend', onScrollEnd);
});
onUnmounted(() => {
  mainElement()?.removeEventListener('scroll', onContentScroll);
  mainElement()?.removeEventListener('scrollend', onScrollEnd);
  cancelAnimationFrame(scrollRaf);
});

/* 快捷键 */
const scrollBy = (delta: number) => {
  const el = mainElement();
  if (el) el.scrollTo({ top: el.scrollTop + delta, behavior: 'smooth' });
};

/* 自动阅读 */
const autoReading = ref(false);
let autoRaf = 0;
let autoLast = 0;
/** 小数像素累积：浏览器会把 scrollTop 取整，逐帧的小数增量会被直接抹掉 */
let autoAcc = 0;
/** 非连续模式下等待章节加载 */
let autoLoadingChapter = false;

const stopAutoRead = () => {
  autoReading.value = false;
  cancelAnimationFrame(autoRaf);
  autoRaf = 0;
  autoAcc = 0;
};

/** RAF 回调保持同步，异步加载放到循环外，避免动画帧中断导致不滚动 */
const autoTick = (timestamp: number) => {
  if (!autoReading.value) return;
  const el = mainElement();
  if (!el) {
    stopAutoRead();
    return;
  }
  const dt = autoLast ? Math.min((timestamp - autoLast) / 1000, 0.1) : 0.016;
  autoLast = timestamp;

  if (el.scrollTop >= el.scrollHeight - el.clientHeight - 1) {
    autoAcc = 0;
    if (!canNext.value) {
      stopAutoRead();
      message.success('已读完本书最后一章');
      return;
    }
    if (options.value.enableScrollToggleChapter) {
      // 连续阅读：追加下一章，失败则停止
      if (!loadingAdjacent.value) {
        const lastIndex = flow.value[flow.value.length - 1]?.chapter.index;
        void maybeLoadNext().then(async () => {
          await nextTick();
          if (!autoReading.value) return;
          if (flow.value[flow.value.length - 1]?.chapter.index === lastIndex) {
            stopAutoRead();
            message.warning('无法加载下一章');
          }
        });
      }
    } else if (!autoLoadingChapter) {
      // 整章切换：加载完成后从章节顶部继续
      autoLoadingChapter = true;
      void textContentStore
        .nextChapter(true)
        .finally(() => {
          autoLoadingChapter = false;
          autoLast = 0;
        });
    }
  } else {
    autoAcc += (settings.options.autoReadSpeed || 30) * dt;
    const step = Math.floor(autoAcc);
    if (step > 0) {
      autoAcc -= step;
      const max = el.scrollHeight - el.clientHeight;
      el.scrollTop = Math.min(max, el.scrollTop + step);
    }
  }

  if (autoReading.value) autoRaf = requestAnimationFrame(autoTick);
};

const toggleAutoRead = () => {
  if (autoReading.value) {
    stopAutoRead();
    return;
  }
  autoReading.value = true;
  autoLast = 0;
  autoAcc = 0;
  autoRaf = requestAnimationFrame(autoTick);
};

/* 用户主动滚动时暂停自动阅读 */
const onUserWheel = () => {
  if (autoReading.value) stopAutoRead();
};

onMounted(() => window.addEventListener('wheel', onUserWheel, { passive: true }));
onUnmounted(() => {
  window.removeEventListener('wheel', onUserWheel);
  stopAutoRead();
});

useShortcutKey(
  {
    ArrowLeft: () => canPrev.value && textContentStore.prevChapter(true),
    ArrowRight: () => canNext.value && textContentStore.nextChapter(true),
    ArrowUp: () => {
      stopAutoRead();
      scrollBy(-settings.scrollbarStepValue);
    },
    ArrowDown: () => {
      stopAutoRead();
      scrollBy(settings.scrollbarStepValue);
    },
    ' ': () => {
      stopAutoRead();
      scrollBy(mainElement()?.clientHeight || 400);
    },
    Escape: () => closePanels()
  },
  ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ']
);

/* 日间 / 夜间模式切换 */
const dayBackgroundId = ref(
  settings.readStyle.background.id === DefaultReadColor.NIGHT.id
    ? DefaultReadColor.WHITE_PURE.id
    : settings.readStyle.background.id
);

watch(
  () => settings.readStyle.background.id,
  id => {
    if (!windowStore.isDark && id !== DefaultReadColor.NIGHT.id) dayBackgroundId.value = id;
  }
);

const toggleTheme = () => {
  if (isDark.value) {
    settings.setTheme('light');
    settings.setDefaultReadColorById(dayBackgroundId.value);
  } else {
    dayBackgroundId.value = settings.readStyle.background.id;
    settings.setTheme('dark');
    settings.setDefaultReadColorById(DefaultReadColor.NIGHT.id);
  }
};

/* 章节目录跳转 */
const selectChapter = async (index: number) => {
  chapterPickerVisible.value = false;
  if (index === textContentStore.currentChapter?.index) return;
  try {
    await textContentStore.goToChapter(index);
  } catch (e: any) {
    e && message.error(errorHandler(e, true));
    GLOBAL_LOG.error('selectChapter', e);
  }
};

/* 亮度 / 护眼遮罩 */
const brightnessMaskOpacity = computed(() => {
  if (options.value.followSystemBrightness) return 0;
  return Math.min(0.75, Math.max(0, (100 - options.value.brightness) / 100));
});

/* 复制选中文本 */
const copyText = () => {
  const selection = getSelection();
  const text = selection?.toString() || '';
  if (!text.trim()) {
    message.warning('请先选中要复制的文本');
    return;
  }
  try {
    const { clipboard } = (window as any).require('electron');
    clipboard.writeText(text);
    message.success('已复制');
  } catch (e) {
    message.error('复制失败');
    GLOBAL_LOG.error('copyText', e);
  }
};

/* 书签高亮开关关闭时，正文中不再显示书签样式 */
const bookmarkHighlight = computed(() => options.value.enableBookmarkHighlight);
</script>

<template>
  <div class="read-view" :style="{ backgroundColor }">
    <div class="read-progress-bar" :style="{ width: `${readProgress}%` }" />

    <!-- 亮度 / 护眼遮罩 -->
    <div class="read-mask dim" :style="{ opacity: brightnessMaskOpacity }" />
    <div v-if="options.enableEyeCare" class="read-mask eye-care" />

    <div v-if="isRunningGetTextContent" class="read-loading">
      <div class="rc-spinner"><span></span><span></span></div>
    </div>

    <div v-else id="text-content" :class="['rc-scrollbar', bookmarkHighlight ? '' : 'no-bookmark-highlight']" :style="chapterStyle" v-html="contents" />

    <!-- 阅读工具栏 -->
    <div v-if="!isRunningGetTextContent" class="read-toolbar">
      <button class="read-toolbar-btn" :disabled="!canPrev" title="上一章 (←)" @click="textContentStore.prevChapter(true)">
        <Icon name="back" :size="16" />
      </button>
      <button class="read-toolbar-title rc-ellipsis" :title="`${currentChapter?.title || '未知章节'}（点击打开目录）`" @click="togglePanel('chapter')">
        {{ currentChapter?.title || '未知章节' }}
      </button>
      <span class="read-toolbar-index">{{ detail.currentReadIndex + 1 }} / {{ chapterList.length }}</span>
      <button class="read-toolbar-btn" :disabled="!canNext" title="下一章 (→)" @click="textContentStore.nextChapter(true)">
        <Icon name="forward" :size="16" />
      </button>
      <button :class="['read-toolbar-btn', autoReading ? 'active' : '']" :title="autoReading ? '停止自动阅读' : '自动阅读'" @click="toggleAutoRead">
        <Icon :name="autoReading ? 'pause' : 'play'" :size="16" />
      </button>
      <button class="read-toolbar-btn" :title="isDark ? '切换到日间模式' : '切换到夜间模式'" @click="toggleTheme">
        <Icon :name="isDark ? 'sun' : 'moon'" :size="16" />
      </button>
      <button :class="['read-toolbar-btn', options.enableEyeCare ? 'active' : '']" :title="options.enableEyeCare ? '关闭护眼模式' : '护眼模式'" @click="options.enableEyeCare = !options.enableEyeCare">
        <Icon name="eye" :size="16" />
      </button>
      <button :class="['read-toolbar-btn', bookmarkPanelVisible ? 'active' : '']" title="书签列表" @click="togglePanel('bookmark')">
        <Icon name="bookmark" :size="16" />
      </button>
      <button :class="['read-toolbar-btn', panelVisible ? 'active' : '']" title="阅读设置" @click="togglePanel('settings')">
        <Icon name="settings" :size="16" />
      </button>
    </div>

    <!-- 目录（右键菜单） -->
    <Menu trigger="#main">
      <MenuItem label="上一章" :disabled="!canPrev" @click="textContentStore.prevChapter(true)" />
      <MenuItem label="下一章" :disabled="!canNext" @click="textContentStore.nextChapter(true)" />
      <MenuItem divider />
      <MenuItem label="设置书签" @click="setBookmark" />
      <MenuItem label="复制所选文本" @click="copyText" />
      <MenuItem divider />
      <MenuItem label="返回目录" @click="router.push({ path: PagePath.DETAIL, query: { pid, detailUrl } })" />
    </Menu>

    <!-- 书签输入 -->
    <Dialog v-model="promptVisible" title="添加书签" width="460px" confirm-text="保存书签" @confirm="confirmSetBookmark" @close="cancelSetBookmark">
      <div class="bookmark-form">
        <p class="bookmark-form-chapter">{{ currentChapter?.title }}</p>
        <p class="bookmark-form-text">{{ promptTitle }}</p>
        <label class="rc-label">备注</label>
        <textarea v-model="promptNote" class="rc-input bookmark-form-input rc-scrollbar" rows="3" placeholder="为这段内容添加备注" />
      </div>
    </Dialog>

    <!-- 书签详情 -->
    <Dialog v-model="detailVisible" title="书签" width="440px" :show-footer="false">
      <div class="bookmark-detail">
        <h4>{{ detailTitle }}</h4>
        <p class="bookmark-detail-time">{{ detailTime }}</p>
        <p v-if="detailNote" class="bookmark-detail-note">{{ detailNote }}</p>
        <p v-else class="bookmark-detail-note empty">无备注</p>
      </div>
    </Dialog>

    <!-- 阅读设置面板 -->
    <ReadSettings v-model:visible="panelVisible" />

    <!-- 书签列表 -->
    <BookmarkPanel v-model:visible="bookmarkPanelVisible" :detail-url="detailUrl" />

    <!-- 章节目录 -->
    <ChapterPicker v-model:visible="chapterPickerVisible" :chapters="chapterList" :current-index="detail.currentReadIndex" @select="selectChapter" />
  </div>
</template>

<style scoped lang="scss">
.read-view {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
  padding: 30px 0 130px;
  transition: background-color 0.3s ease;
}

#text-content {
  font-family: var(--rc-font-family);
  user-select: text;
  -webkit-user-select: text;

  /* v-html 渲染的内容没有 scoped 属性，必须用 :deep 才能命中 */
  :deep(div[data-index]) {
    margin-bottom: var(--rc-section-spacing);
    text-indent: 2em;
    user-select: text;
    -webkit-user-select: text;
    cursor: text;
    overflow: hidden;

    .bookmark {
      border-bottom: 1.5px solid var(--rc-bookmark-odd-color);
      color: var(--rc-bookmark-odd-color);
      cursor: pointer;
      user-select: text;
      -webkit-user-select: text;

      &.even {
        border-bottom: 1.5px solid var(--rc-bookmark-even-color);
        color: var(--rc-bookmark-even-color);
      }
    }

    &:first-child {
      display: none;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(.chapter-block + .chapter-block) {
    padding-top: 6px;
  }

  &.no-bookmark-highlight :deep(.bookmark) {
    border-bottom: none;
    color: inherit;
  }
}

.read-mask {
  position: fixed;
  top: var(--rc-title-bar-height);
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1900;
  pointer-events: none;

  &.dim {
    background-color: #000;
    transition: opacity 0.2s ease;
  }
  &.eye-care {
    background-color: rgba(255, 178, 74, 0.18);
  }
}

.read-progress-bar {
  position: fixed;
  top: var(--rc-title-bar-height);
  left: 0;
  z-index: 2100;
  height: 2px;
  background-color: var(--rc-primary);
  transition: width 0.15s linear;
}

.read-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.rc-spinner {
  position: relative;
  width: 50px;
  height: 50px;
  color: var(--rc-primary);

  span {
    position: absolute;
    inset: 0;
    border: 3px solid currentColor;
    border-radius: 50%;
    animation: read-ripple 1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
  }
  span:nth-child(2) {
    animation-delay: -0.5s;
  }
}

@keyframes read-ripple {
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

.read-toolbar {
  position: fixed;
  bottom: 22px;
  left: 50%;
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 70%;
  padding: 5px 8px;
  border: 1px solid var(--rc-border);
  border-radius: 22px;
  background-color: var(--rc-panel);
  box-shadow: var(--rc-shadow);
  transform: translateX(-50%);
  opacity: 0.86;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }
}

.read-toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: var(--rc-text-secondary);
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: var(--rc-hover);
    color: var(--rc-primary);
  }
  &.active {
    color: var(--rc-primary);
    background-color: var(--rc-hover);
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.read-toolbar-title {
  max-width: 300px;
  padding: 0 6px;
  font-size: 13px;
  color: var(--rc-text);
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: var(--rc-primary);
  }
}

.read-toolbar-index {
  font-size: 12px;
  color: var(--rc-text-secondary);
  white-space: nowrap;
}

.bookmark-form {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .bookmark-form-chapter {
    font-size: 13.5px;
    font-weight: 600;
  }
  .bookmark-form-text {
    max-height: 90px;
    overflow-y: auto;
    padding: 8px 10px;
    border-radius: 6px;
    background-color: var(--rc-panel-2);
    font-size: 12.5px;
    color: var(--rc-text-secondary);
    white-space: pre-wrap;
    user-select: text;
  }
  .bookmark-form-input {
    width: 100%;
    height: auto;
    padding: 8px 10px;
    resize: vertical;
    line-height: 1.6;
  }
}

.bookmark-detail {
  h4 {
    font-size: 14px;
    font-weight: 600;
    user-select: text;
  }
  .bookmark-detail-time {
    margin-top: 4px;
    font-size: 12px;
    color: var(--rc-text-secondary);
    text-align: right;
  }
  .bookmark-detail-note {
    margin-top: 10px;
    font-size: 13px;
    line-height: 1.7;
    user-select: text;
    white-space: pre-wrap;

    &.empty {
      color: var(--rc-text-secondary);
    }
  }
}
</style>

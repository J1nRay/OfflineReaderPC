<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue';
import { useBookmarkStore } from '../../../store/bookmark';
import { useDetailStore } from '../../../store/detail';
import { useTextContentStore } from '../../../store/text-content';
import { useMessage } from '../../../hooks/message';
import { formatDate } from '../../../core/utils';
import Icon from '../../../components/icon/index.vue';
import type { BookmarkRange, BookmarkStoreEntity } from '../../../core/database/database';

const props = defineProps<{ visible: boolean; detailUrl: string }>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const message = useMessage();
const bookmarkStore = useBookmarkStore();
const detail = useDetailStore();
const textContentStore = useTextContentStore();

const close = () => emit('update:visible', false);

/** 书签按章节顺序分组展示 */
const groups = computed(() => {
  void bookmarkStore.bookmarks.length;
  return bookmarkStore
    .getBookmarksByDetailUrl(props.detailUrl)
    .map(bookmark => ({
      bookmark,
      chapterIndex: detail.detailResult?.chapterList.findIndex(c => c.url === bookmark.chapterUrl) ?? -1
    }))
    .sort((a, b) => a.chapterIndex - b.chapterIndex || a.bookmark.timestamp - b.bookmark.timestamp);
});

const total = computed(() => groups.value.reduce((prev, curr) => prev + curr.bookmark.range.length, 0));

/** 备注与书签正文不同才展示，避免重复 */
const hasNote = (range: BookmarkRange) => {
  const note = range.content?.trim();
  return !!note && note !== range.title.trim();
};

const jumping = ref(false);

/** 定位到书签所在章节与片段 */
const jump = async (bookmark: BookmarkStoreEntity, range: BookmarkRange) => {
  if (jumping.value) return;
  jumping.value = true;
  try {
    const index = detail.detailResult?.chapterList.findIndex(c => c.url === bookmark.chapterUrl) ?? -1;
    if (index < 0) {
      message.warning('书签所在章节不存在');
      return;
    }
    if (index !== textContentStore.currentChapter?.index) {
      await textContentStore.goToChapter(index);
      await nextTick();
      await nextTick();
    }
    const el = document.getElementById(range.id);
    if (!el) {
      message.warning('无法定位书签，章节内容可能已更新');
      return;
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  } catch (e: any) {
    message.error(e?.message || String(e));
    GLOBAL_LOG.error('bookmark jump', e);
  } finally {
    jumping.value = false;
  }
};

const removeRange = async (bookmark: BookmarkStoreEntity, range: BookmarkRange) => {
  try {
    await bookmarkStore.removeBookmarkRangeByBidAndId(bookmark.id, range.id);
    message.success('书签已删除');
  } catch (e: any) {
    message.error(e?.message || String(e));
    GLOBAL_LOG.error('bookmark remove', e);
  }
};
</script>

<template>
  <Transition name="rc-panel">
    <aside v-if="visible" class="bookmark-panel">
      <header class="bookmark-panel-header">
        <span>书签（{{ total }}）</span>
        <button class="bookmark-panel-close" title="关闭" @click="close">
          <Icon name="close" :size="15" />
        </button>
      </header>

      <div class="bookmark-panel-body rc-scrollbar">
        <p v-if="groups.length < 1" class="bookmark-empty">还没有添加书签，选中正文后右键即可添加</p>
        <section v-for="g in groups" :key="g.bookmark.id" class="bm-group">
          <p class="bm-chapter" :title="g.bookmark.chapterTitle">
            {{ g.chapterIndex >= 0 ? `${g.chapterIndex + 1}. ` : '' }}{{ g.bookmark.chapterTitle }}
          </p>
          <div v-for="r in g.bookmark.range" :key="r.id" class="bm-item">
            <div class="bm-item-main" title="点击定位" @click="jump(g.bookmark, r)">
              <p class="bm-text">{{ r.title }}</p>
              <p v-if="hasNote(r)" class="bm-note" :title="r.content">
                <span class="bm-note-label">备注</span>{{ r.content }}
              </p>
              <p class="bm-meta">{{ formatDate(r.timestamp, 'yyyy/MM/dd HH:mm') }}</p>
            </div>
            <button class="bm-remove" title="删除书签" @click.stop="removeRange(g.bookmark, r)">
              <Icon name="trash" :size="13" />
            </button>
          </div>
        </section>
      </div>
    </aside>
  </Transition>
</template>

<style scoped lang="scss">
.bookmark-panel {
  position: fixed;
  top: var(--rc-title-bar-height);
  right: 0;
  bottom: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  width: 320px;
  border-left: 1px solid var(--rc-border);
  background-color: var(--rc-panel);
  box-shadow: -6px 0 22px rgba(0, 0, 0, 0.1);
}

.bookmark-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid var(--rc-border);
  font-size: 14px;
  font-weight: 600;
}

.bookmark-panel-close {
  display: flex;
  align-items: center;
  color: var(--rc-text-secondary);
  &:hover {
    color: var(--rc-danger);
  }
}

.bookmark-panel-body {
  flex: 1;
  padding: 12px 16px;
  overflow-y: auto;
}

.bookmark-empty {
  margin-top: 30px;
  font-size: 12.5px;
  color: var(--rc-text-secondary);
  line-height: 1.8;
  text-align: center;
}

.bm-group {
  margin-bottom: 16px;
}

.bm-chapter {
  margin-bottom: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--rc-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bm-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
  border: 1px solid var(--rc-border);
  border-radius: 8px;
  background-color: var(--rc-panel-2);
  transition: border-color 0.15s ease;

  &:hover {
    border-color: var(--rc-primary);
  }
}

.bm-item-main {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.bm-text {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--rc-text);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.bm-meta {
  margin-top: 4px;
  font-size: 11.5px;
  color: var(--rc-text-secondary);
}

.bm-note {
  display: -webkit-box;
  margin-top: 5px;
  padding: 4px 7px;
  overflow: hidden;
  border-radius: 4px;
  background-color: var(--rc-hover);
  font-size: 12px;
  line-height: 1.6;
  color: var(--rc-text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.bm-note-label {
  margin-right: 5px;
  font-size: 11px;
  color: var(--rc-primary);
}

.bm-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 4px;
  color: var(--rc-text-secondary);
  visibility: hidden;

  &:hover {
    color: var(--rc-danger);
    background-color: var(--rc-hover);
  }
}

.bm-item:hover .bm-remove {
  visibility: visible;
}
</style>

import { onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useScrollTopStore } from '../../../store/scrolltop';
import { useDetailStore } from '../../../store/detail';
import { useBookshelfStore } from '../../../store/bookshelf';
import { useTextContentStore } from '../../../store/text-content';

/**
 * 阅读页滚动位置记录：
 * 滚动结束时把「章节索引 + 滚动偏移」写回书架，实现阅读进度记忆
 */
export const useScrollTop = (pid: string, detailUrl: string) => {
  const scrollTopStore = useScrollTopStore();
  const { mainElement } = storeToRefs(scrollTopStore);
  const { currentChapter } = storeToRefs(useTextContentStore());
  const detail = useDetailStore();
  const bookshelf = useBookshelfStore();

  let scrollTop = 0;

  const save = (index: number, top: number) => {
    bookshelf.updateReadProgress(pid, detailUrl, index, top).then(() => {
      detail.currentReadScrollTop = { chapterIndex: index, scrollTop: top };
    });
  };

  const listener = (e: Event) => {
    const el = e.target as HTMLElement;
    const index = currentChapter.value?.index ?? detail.currentReadIndex;
    // 连续阅读时正文包含多个章节，记录相对当前章节起点的偏移，便于下次恢复到同一章节位置
    const block = el.querySelector<HTMLElement>(`.chapter-block[data-chapter-index="${index}"]`);
    scrollTop = block
      ? el.scrollTop - block.offsetTop + scrollTopStore.textContentOffsetTop()
      : el.scrollTop;
    save(index, scrollTop);
  };

  onMounted(() => {
    scrollTopStore.scrollToTextContent(void 0, 'instant');
    mainElement.value?.addEventListener('scrollend', listener);
  });

  onUnmounted(() => {
    mainElement.value?.removeEventListener('scrollend', listener);
    const index = currentChapter.value?.index ?? detail.currentReadIndex;
    if (index >= 0) save(index, scrollTop);
  });
};

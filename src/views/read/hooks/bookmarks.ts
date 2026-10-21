import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { nanoid } from 'nanoid';
import { isNull, isUndefined } from '../../../core/is';
import { useMessage } from '../../../hooks/message';
import { useTextContentStore, type TextContent } from '../../../store/text-content';
import { useBookmarkStore } from '../../../store/bookmark';
import { useDetailStore } from '../../../store/detail';
import { useBookshelfStore } from '../../../store/bookshelf';
import { useSettingsStore } from '../../../store/settings';
import { formatDate } from '../../../core/utils';
import type { Chapter } from '../../../core/book/book';
import type { BookmarkRange, BookmarkStoreEntity } from '../../../core/database/database';

/** 待确认的书签范围 */
type PendingRange = {
  start: number;
  end: number;
  index: number;
  /** 选中的原文 */
  title: string;
};

/**
 * 书签逻辑：
 *  - setBookmark：读取当前选区，按段落拆分为多个范围（支持跨段选择）
 *  - handlerBookmarks：把书签范围包裹为 <span class="bookmark">
 *  - dblclick 书签可查看书签详情
 */
export const useBookmarks = () => {
  const message = useMessage();
  const { options } = storeToRefs(useSettingsStore());
  const { currentChapter } = storeToRefs(useTextContentStore());
  const bookmarkStore = useBookmarkStore();
  const { currentDetailUrl, currentPid } = storeToRefs(useDetailStore());
  const { exist } = useBookshelfStore();

  const promptVisible = ref(false);
  const promptTitle = ref('');
  const promptNote = ref('');
  const pendingRanges = ref<PendingRange[] | null>(null);

  const detailVisible = ref(false);
  const detailTitle = ref('');
  const detailNote = ref('');
  const detailTime = ref('');

  /* 书签详情弹窗（由正文中双击书签触发） */
  if (!Object.hasOwn(window, 'showBookmark')) {
    Object.defineProperty(window, 'showBookmark', {
      get() {
        return (bid: string, rid: string) => {
          const bookmark = bookmarkStore.getBookmarkById(bid);
          const val = bookmark?.range.find(r => r.id === rid);
          if (isUndefined(bookmark) || isUndefined(val)) {
            message.error('无法获取书签');
            return;
          }
          detailTitle.value = val.title;
          detailNote.value = val.content;
          detailTime.value = formatDate(val.timestamp, 'yyyy/MM/dd HH:mm');
          detailVisible.value = true;
        };
      },
      set() {
        return;
      }
    });
  }

  /** 读取选区覆盖的段落节点 */
  const getParagraph = (node: Node): HTMLElement | null => {
    let el: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;
    while (el && !el.matches('div[data-index]')) el = el.parentElement;
    return el;
  };

  /** 计算文本节点在所属段落中的字符偏移 */
  const textOffsetInParagraph = (node: Text) => {
    let offset = 0;
    let prev = node.previousSibling;
    while (prev) {
      offset += prev.textContent?.length || 0;
      prev = prev.previousSibling;
    }
    return offset;
  };

  /** 计算选区所在的段落范围，支持跨段落选择 */
  const resolveRanges = (): PendingRange[] | null => {
    if (isNull(currentDetailUrl.value)) {
      message.error('无法获取书籍链接');
      return null;
    }
    if (isNull(currentChapter.value)) {
      message.error('无法获取当前章节');
      return null;
    }
    if (isNull(currentPid.value)) {
      message.error('无法获取书籍ID');
      return null;
    }
    if (!exist(currentPid.value, currentDetailUrl.value)) {
      message.warning('未加入书架');
      return null;
    }
    const selection = getSelection();
    if (isNull(selection)) {
      message.error('selection is null');
      return null;
    }
    if (selection.type !== 'Range') {
      message.warning('请先选中文字');
      return null;
    }
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      message.warning('请先选中文字');
      return null;
    }
    const startEl = range.startContainer instanceof HTMLElement ? range.startContainer : range.startContainer.parentElement;
    const endEl = range.endContainer instanceof HTMLElement ? range.endContainer : range.endContainer.parentElement;
    if (isNull(startEl) || isNull(endEl)) {
      message.error('段落获取失败');
      return null;
    }
    const startBlock = startEl.closest<HTMLElement>('.chapter-block');
    const endBlock = endEl.closest<HTMLElement>('.chapter-block');
    if (isNull(startBlock) || startBlock !== endBlock) {
      message.warning('暂不支持跨章节设置书签');
      return null;
    }
    if (Number(startBlock.dataset.chapterIndex) !== currentChapter.value.index) {
      message.warning('请在当前章节内选择');
      return null;
    }

    const nodes: Text[] = [];
    const walker = document.createTreeWalker(startBlock, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (!node.nodeValue || !range.intersectsNode(node)) continue;
      nodes.push(node);
    }

    const groups = new Map<number, PendingRange>();
    for (const node of nodes) {
      if (node.parentElement?.classList.contains('bookmark')) {
        message.warning('选中内容包含已有书签，请重新选择');
        return null;
      }
      const paragraph = getParagraph(node);
      if (isNull(paragraph)) continue;
      const index = Number(paragraph.dataset.index);
      if (!Number.isInteger(index)) continue;
      const start = node === range.startContainer ? range.startOffset : 0;
      const end = node === range.endContainer ? range.endOffset : node.textContent.length;
      if (end <= start) continue;
      const base = textOffsetInParagraph(node);
      const text = node.textContent.slice(start, end);
      const existRange = groups.get(index);
      if (existRange) {
        existRange.start = Math.min(existRange.start, base + start);
        existRange.end = Math.max(existRange.end, base + end);
        existRange.title += text;
      } else {
        groups.set(index, { index, start: base + start, end: base + end, title: text });
      }
    }

    const ranges = Array.from(groups.values()).sort((a, b) => a.index - b.index);
    if (ranges.length < 1) {
      message.warning('选中的内容为空');
      return null;
    }

    // 与已有书签范围重叠时拒绝，避免渲染时正文重复
    const bookmark = bookmarkStore.getBookmarkByChapterUrl(currentChapter.value.url);
    if (bookmark) {
      const overlap = ranges.some(r =>
        bookmark.range.some(o => o.index === r.index && r.start < o.end && r.end > o.start)
      );
      if (overlap) {
        message.warning('选中内容与已有书签重叠');
        return null;
      }
    }
    return ranges;
  };

  const setBookmark = () => {
    const pending = resolveRanges();
    if (!pending) return;
    if (!pending.map(v => v.title).join('').trim()) {
      message.warning('选中的内容为空');
      return;
    }
    pendingRanges.value = pending;
    promptTitle.value = pending.map(v => v.title).join('\n');
    promptNote.value = '';
    promptVisible.value = true;
  };

  const cancelSetBookmark = () => {
    promptVisible.value = false;
    pendingRanges.value = null;
    promptTitle.value = '';
    promptNote.value = '';
  };

  const confirmSetBookmark = async () => {
    const pending = pendingRanges.value;
    const chapter = currentChapter.value;
    if (!pending || pending.length < 1 || isNull(chapter) || isNull(currentDetailUrl.value)) {
      cancelSetBookmark();
      return;
    }
    const note = promptNote.value.trim();
    try {
      let bookmark: BookmarkStoreEntity | undefined = bookmarkStore.getBookmarkByChapterUrl(chapter.url);
      if (isUndefined(bookmark)) {
        bookmark = {
          id: `bookmark-${nanoid(12)}`,
          detailUrl: currentDetailUrl.value,
          chapterTitle: chapter.title,
          chapterUrl: chapter.url,
          range: [],
          timestamp: Date.now()
        };
      }
      for (const item of pending) {
        const range: BookmarkRange = {
          id: `bookmark-range-${nanoid(12)}`,
          start: item.start,
          end: item.end,
          index: item.index,
          content: note,
          title: item.title,
          timestamp: Date.now()
        };
        bookmark.range.push(range);
      }
      await bookmarkStore.put({ ...bookmark, timestamp: Date.now() });
      message.success('书签已添加');
      cancelSetBookmark();
    } catch (e: any) {
      message.error(`书签设置失败，${e?.message || String(e)}`);
      GLOBAL_LOG.error('setBookmark', e);
    }
  };

  const addTag = (text: string, index: number) => `<div data-index="${index}">${text}</div>`;

  const handlerBookmarks = (text: string, index: number, bookmark?: BookmarkStoreEntity) => {
    if (isUndefined(bookmark)) return addTag(text, index);
    const ranges = bookmark.range.filter(v => v.index === index);
    if (ranges.length <= 0) return addTag(text, index);
    const arr: string[] = [];
    const sort = ranges.sort((a, b) => a.start - b.start);
    const handler = (from: number, idx: number) => {
      if (idx >= sort.length) {
        const substr = text.slice(from);
        if (substr.length > 0) arr.push(substr);
        return;
      }
      const { start, end, id } = sort[idx];
      const substr = text.slice(from, start);
      if (substr.length > 0) arr.push(substr);
      arr.push(
        `<span id="${id}" class="bookmark${(idx + 1) % 2 === 0 ? ' even' : ''}" ondblclick="showBookmark('${bookmark!.id}','${id}')">${text.slice(
          start,
          end
        )}</span>`
      );
      handler(end, idx + 1);
    };
    handler(0, 0);
    return addTag(arr.join(''), index);
  };

  /** 渲染指定章节的正文 HTML（含书签高亮） */
  const renderChapter = (chapter: Chapter, data: TextContent | null) => {
    if (isNull(data) || data.contents.length <= 1) {
      const err = isNull(data) ? ['无法获取章节标题'] : [...data.contents];
      err.push('正文获取失败');
      return err.map(e => addTag(e, 1)).join('');
    }
    const bookmark = bookmarkStore.getBookmarkByChapterUrl(chapter.url);
    return data.contents.map((text, index) => handlerBookmarks(text, index, bookmark)).join('');
  };

  return {
    options,
    renderChapter,
    setBookmark,
    promptVisible,
    promptTitle,
    promptNote,
    cancelSetBookmark,
    confirmSetBookmark,
    detailVisible,
    detailTitle,
    detailNote,
    detailTime
  };
};

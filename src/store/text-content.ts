import { defineStore } from 'pinia';
import type { Chapter } from '../core/book/book';
import { errorHandler, newError } from '../core/utils';
import { isNull } from '../core/is';
import { nextTick } from 'vue';
import { useDetailStore } from './detail';
import { useMessage } from '../hooks/message';
import { useScrollTopStore } from './scrolltop';
import { useBookshelfStore } from './bookshelf';
import { useWindowStore } from './window';

export type TextContent = {
  contents: string[];
  length: number;
};

export type TextContentEvent = 'chapterchange';

export const useTextContentStore = defineStore('TextContent', {
  state: () => ({
    textContent: null as TextContent | null,
    isRunningGetTextContent: false,
    currentChapter: null as Chapter | null,
    events: new Map<TextContentEvent, () => void>()
  }),
  actions: {
    on(type: TextContentEvent, listener: () => void) {
      this.events.set(type, listener);
    },
    async handlerChapter(type: 'next' | 'prev') {
      const detail = useDetailStore();
      const message = useMessage();
      try {
        if (this.isRunningGetTextContent) throw newError('正在获取章节正文');
        if (isNull(detail.detailResult) || detail.detailResult.chapterList.length <= 0) throw newError('无法获取章节列表');
        if (isNull(this.currentChapter)) throw newError('无法获取当前章节信息');
        if (isNull(detail.currentPid)) throw newError('无法获取书籍ID');

        let index: number;
        if (type === 'next') {
          index = this.currentChapter.index + 1;
          if (index >= detail.detailResult.chapterList.length) {
            message.warning('当前已是最后一章');
            throw null;
          }
        } else {
          index = this.currentChapter.index - 1;
          if (index < 0) {
            message.warning('当前已是第一章');
            throw null;
          }
        }
        await this.goToChapter(index);
      } catch (e: any) {
        e && message.error(errorHandler(e, true));
        if (e) throw e;
        throw null;
      }
    },
    /** 跳转到指定序号的章节 */
    async goToChapter(index: number) {
      const detail = useDetailStore();
      const bookshelf = useBookshelfStore();
      if (this.isRunningGetTextContent) throw newError('正在获取章节正文');
      if (isNull(detail.detailResult) || detail.detailResult.chapterList.length <= 0) throw newError('无法获取章节列表');
      if (isNull(detail.currentPid)) throw newError('无法获取书籍ID');
      const list = detail.detailResult.chapterList;
      if (!Number.isInteger(index) || index < 0 || index >= list.length) throw newError('章节不存在');
      try {
        await this.getTextContent(detail.currentPid, list[index]);
        detail.setCurrentReadIndex(index);
        detail.currentReadScrollTop.chapterIndex = index;
        detail.currentReadScrollTop.scrollTop = 0;
        useWindowStore().calcReadProgress();
        if (detail.currentPid && detail.currentDetailUrl) {
          await bookshelf.updateReadProgress(detail.currentPid, detail.currentDetailUrl, index, 0);
        }
      } finally {
        useScrollTopStore().scrollToTextContent();
      }
    },
    async nextChapter(ignoreError = false) {
      const listener = this.events.get('chapterchange');
      await this.handlerChapter('next')
        .then(() => listener && listener())
        .catch(e => (ignoreError ? Promise.resolve() : Promise.reject(e)));
    },
    async prevChapter(ignoreError = false) {
      const listener = this.events.get('chapterchange');
      await this.handlerChapter('prev')
        .then(() => listener && listener())
        .catch(e => (ignoreError ? Promise.resolve() : Promise.reject(e)));
    },
    /** 读取指定章节正文（不改变当前阅读状态，用于连续加载下一章） */
    async fetchTextContent(pid: string, chapter: Chapter): Promise<TextContent | null> {
      try {
        const db = await GLOBAL_DB.store.textContentStore.getByPidAndChapterUrl(pid, chapter.url);
        if (!db) return null;
        const lengths = db.textContent.map(t => t.length);
        return {
          contents: [db.chapter.title, ...db.textContent],
          length: lengths.length > 0 ? lengths.reduce((prev, curr) => prev + curr, 0) : 0
        };
      } catch (e) {
        GLOBAL_LOG.error('TextContentStore fetchTextContent', e);
        return null;
      }
    },
    /** 从本地数据库读取章节正文 */
    async getTextContent(pid: string, chapter: Chapter): Promise<void> {
      if (this.isRunningGetTextContent) return;
      this.isRunningGetTextContent = true;
      this.textContent = null;
      this.currentChapter = null;
      try {
        const data = await this.fetchTextContent(pid, chapter);
        this.currentChapter = chapter;
        if (!data) throw newError('无法获取章节内容');
        this.textContent = data;
      } catch (e) {
        GLOBAL_LOG.error('TextContentStore getTextContent', e);
        return errorHandler(e);
      } finally {
        nextTick(() => {
          this.isRunningGetTextContent = false;
          useScrollTopStore().scrollToTextContent(undefined, 'instant');
        });
      }
    },
    async removeTextContentsByPidAndDetailUrl(pid: string, detailUrl: string) {
      try {
        await GLOBAL_DB.store.textContentStore.removeByPidAndDetailUrl(pid, detailUrl);
      } catch (e: any) {
        useMessage().error(errorHandler(e, true));
        return errorHandler(e);
      }
    }
  }
});

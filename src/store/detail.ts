import { defineStore } from 'pinia';
import type { BookshelfStoreEntity } from '../core/database/database';
import { isNumber } from '../core/is';

/** 详情页/阅读页共享状态（本地书籍） */
export const useDetailStore = defineStore('Detail', {
  state: () => ({
    detailResult: null as BookshelfStoreEntity | null,
    error: null as string | null,
    currentPid: null as string | null,
    currentDetailUrl: null as string | null,
    currentReadIndex: -1,
    currentReadScrollTop: {
      chapterIndex: -1,
      scrollTop: 0
    }
  }),
  actions: {
    setCurrentReadIndex(index: number) {
      this.currentReadIndex = isNumber(index) ? index : -1;
    },
    async setBook(pid: string, url: string) {
      this.detailResult = null;
      this.error = null;
      const book = await GLOBAL_DB.store.bookshelfStore.getByPidAndDetailPageUrl(pid, url);
      if (!book) {
        this.error = '无法获取书籍详情';
        return;
      }
      this.detailResult = book;
      this.currentPid = pid;
      this.currentDetailUrl = url;
      this.setCurrentReadIndex(book.readIndex);
      this.currentReadScrollTop = {
        chapterIndex: book.readIndex,
        scrollTop: book.readScrollTop
      };
    }
  }
});

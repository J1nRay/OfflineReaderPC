import { defineStore } from 'pinia';
import type { BookshelfStoreEntity } from '../core/database/database';
import { useMessage } from '../hooks/message';
import { errorHandler, newError, replaceInvisibleStr } from '../core/utils';
import { isNull } from '../core/is';

export type Book = {
  id: string;
  pid: string;
  detailPageUrl: string;
  bookname: string;
  author: string;
  coverImageUrl: string;
  latestChapterTitle?: string;
  searchIndex: string;
  readIndex: number;
  readChapterTitle: string;
  lastReadTime: number;
  /** 章节总数 */
  chapterCount: number;
  /** 正文字数 */
  wordCount: number;
  /** 所属分组 ID，空串表示未分组 */
  groupId: string;
  /** 手动排序序号，越大越靠前 */
  sortIndex: number;
  timestamp: number;
};

export const useBookshelfStore = defineStore('Bookshelf', {
  state: () => ({
    _books: new Map<string, Book>(),
    currentPage: 1
  }),
  getters: {
    /** 按手动排序序号（默认导入时间）倒序 */
    books(): Book[] {
      return Array.from(this._books.values()).sort(
        (a, b) => (b.sortIndex || b.timestamp) - (a.sortIndex || a.timestamp)
      );
    }
  },
  actions: {
    async getBookshelfEntity(pid: string, detailPageUrl: string) {
      try {
        return await GLOBAL_DB.store.bookshelfStore.getByPidAndDetailPageUrl(pid, detailPageUrl);
      } catch (e: any) {
        useMessage().error(e.message);
        return errorHandler(e);
      }
    },
    exist(pid: string, detailPageUrl: string) {
      return Array.from(this._books.values()).findIndex(
        v => v.pid === pid && v.detailPageUrl === detailPageUrl
      ) >= 0;
    },
    async put(entity: BookshelfStoreEntity): Promise<void> {
      try {
        const _entity = replaceInvisibleStr(entity);
        if (!_entity.id.trim()) throw newError('ID 为空');
        if (!_entity.pid.trim() || !_entity.detailPageUrl.trim()) throw newError('PID 或 DetailUrl 为空');
        const {
          id, pid, detailPageUrl, bookname, author, coverImageUrl,
          chapterList, latestChapterTitle, searchIndex, readIndex, lastReadTime, timestamp,
          wordCount, groupId, sortIndex
        } = _entity;
        await GLOBAL_DB.store.bookshelfStore.put(_entity);
        this._books.set(id, {
          id, pid, detailPageUrl, bookname, author, coverImageUrl,
          latestChapterTitle, searchIndex, readIndex,
          readChapterTitle: chapterList[readIndex]?.title,
          lastReadTime: lastReadTime || 0,
          chapterCount: chapterList?.length || 0,
          wordCount: wordCount || 0,
          groupId: groupId || '',
          sortIndex: sortIndex || timestamp,
          timestamp
        });
      } catch (e: any) {
        useMessage().error(e.message);
        return errorHandler(e);
      }
    },
    async remove(id: string): Promise<void> {
      try {
        if (this._books.has(id)) {
          await GLOBAL_DB.store.bookshelfStore.remove(id);
          this._books.delete(id);
        }
      } catch (e: any) {
        useMessage().error(e.message);
        return errorHandler(e);
      }
    },
    async removeByPidAndDetailUrl(pid: string, detailUrl: string): Promise<void> {
      try {
        const entity = Array.from(this._books.values()).find(
          v => v.pid === pid && v.detailPageUrl === detailUrl
        );
        if (entity) {
          await GLOBAL_DB.store.bookshelfStore.remove(entity.id);
          this._books.delete(entity.id);
        }
      } catch (e: any) {
        useMessage().error(e.message);
        return errorHandler(e);
      }
    },
    /** 局部更新书籍字段（分组 / 排序等） */
    async updateFields(id: string, patch: Partial<BookshelfStoreEntity>): Promise<void> {
      try {
        const entity = await GLOBAL_DB.store.bookshelfStore.getById(id);
        if (isNull(entity) || !entity) return;
        await this.put({ ...entity, ...patch });
      } catch (e: any) {
        useMessage().error(e.message);
        return errorHandler(e);
      }
    },
    /** 批量移动到指定分组（groupId 为空串表示移出分组） */
    async moveToGroup(ids: string[], groupId: string): Promise<void> {
      for (const id of ids) await this.updateFields(id, { groupId });
    },
    /** 更新手动排序序号 */
    async setSortIndex(id: string, sortIndex: number): Promise<void> {
      await this.updateFields(id, { sortIndex });
    },
    /** 更新阅读进度 */
    async updateReadProgress(pid: string, detailPageUrl: string, readIndex: number, readScrollTop: number) {
      const entity = await this.getBookshelfEntity(pid, detailPageUrl);
      if (isNull(entity) || !entity) return;
      await this.put({
        ...entity,
        readIndex,
        readScrollTop,
        lastReadTime: Date.now()
      });
    }
  }
});

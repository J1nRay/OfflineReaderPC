import type { Chapter } from '../../book/book';
import { isNull, isUndefined } from '../../is';
import type { TextContentStoreEntity } from '../database';
import { BaseStoreDatabase } from './base-store';

export class TextContentStoreDatabase extends BaseStoreDatabase<TextContentStoreEntity> {
  constructor(db: IDBDatabase, storeName: string) {
    super(db, storeName, 'TextContentStoreDatabase');
  }
  getByPidAndDetailUrl(pid: string, detailUrl: string): Promise<TextContentStoreEntity[] | null> {
    return new Promise<TextContentStoreEntity[] | null>((reso, reje) => {
      try {
        const requ = this.db
          .transaction([this.storeName], 'readonly')
          .objectStore(this.storeName)
          .index('index_pid_detailUrl')
          .getAll(IDBKeyRange.only([pid, detailUrl]));
        requ.onsuccess = () => reso(isUndefined(requ.result) ? null : requ.result);
        requ.onerror = () => {
          GLOBAL_LOG.error(this.tag, 'getByPidAndDetailUrl', requ.error);
          return reje(requ.error);
        };
      } catch (e) {
        GLOBAL_LOG.error(this.tag, 'getByPidAndDetailUrl', e);
        return reje(e);
      }
    });
  }
  getByPidAndChapterUrl(pid: string, chapterUrl: string): Promise<TextContentStoreEntity | null> {
    return new Promise<TextContentStoreEntity | null>((reso, reje) => {
      try {
        const requ = this.db
          .transaction([this.storeName], 'readonly')
          .objectStore(this.storeName)
          .index('index_pid_chapterUrl')
          .get(IDBKeyRange.only([pid, chapterUrl]));
        requ.onsuccess = () => reso(isUndefined(requ.result) ? null : requ.result);
        requ.onerror = () => {
          GLOBAL_LOG.error(this.tag, 'getByPidAndChapterUrl', requ.error);
          return reje(requ.error);
        };
      } catch (e) {
        GLOBAL_LOG.error(this.tag, 'getByPidAndChapterUrl', e);
        return reje(e);
      }
    });
  }
  async put(val: TextContentStoreEntity): Promise<void> {
    const _val = super.revocationProxy(val);
    const raw = await this.getByPidAndChapterUrl(_val.pid, _val.chapter.url);
    await super.put({ ..._val, id: isNull(raw) ? _val.id : raw.id });
  }
  async removeByPidAndChapter(pid: string, chapter: Chapter): Promise<void> {
    const val = await this.getByPidAndChapterUrl(pid, chapter.url);
    if (isNull(val)) return;
    await this.remove(val.id);
  }
  removeByPidAndDetailUrl(pid: string, detailUrl: string): Promise<void> {
    return this.useCursorRemove('index_pid_detailUrl', [pid, detailUrl]);
  }
}

import { isNull, isUndefined } from '../../is';
import type { BookmarkStoreEntity } from '../database';
import { BaseStoreDatabase } from './base-store';
import { useBookmarkStore } from '../../../store/bookmark';

export class BookmarkStoreDatabase extends BaseStoreDatabase<BookmarkStoreEntity> {
  constructor(db: IDBDatabase, storeName: string) {
    super(db, storeName, 'BookmarkStoreDatabase');
    this.read();
  }
  private read() {
    const store = useBookmarkStore();
    super.getAll().then(res => {
      if (isNull(res) || res.length <= 0) return;
      res.forEach(r => store._bookmarks.set(r.id, r));
    }).catch((e: any) => {
      GLOBAL_LOG.error(this.tag, 'read', e);
    });
  }
  getByChapterUrl(chapterUrl: string): Promise<BookmarkStoreEntity[] | null> {
    return new Promise<BookmarkStoreEntity[] | null>((reso, reje) => {
      try {
        const requ = this.db
          .transaction([this.storeName], 'readonly')
          .objectStore(this.storeName)
          .index('index_chapterUrl')
          .getAll(chapterUrl);
        requ.onsuccess = () => reso(isUndefined(requ.result) ? null : requ.result);
        requ.onerror = () => rejectAndLog(this.tag, 'getByChapterUrl', requ.error, reje);
      } catch (e) {
        GLOBAL_LOG.error(this.tag, 'getByChapterUrl', e);
        return reje(e);
      }
    });
  }
  getByDetailUrl(detailUrl: string): Promise<BookmarkStoreEntity[] | null> {
    return new Promise<BookmarkStoreEntity[] | null>((reso, reje) => {
      try {
        const requ = this.db
          .transaction([this.storeName], 'readonly')
          .objectStore(this.storeName)
          .index('index_detailUrl')
          .getAll(IDBKeyRange.only([detailUrl]));
        requ.onsuccess = () => reso(isUndefined(requ.result) ? null : requ.result);
        requ.onerror = () => rejectAndLog(this.tag, 'getByDetailUrl', requ.error, reje);
      } catch (e) {
        GLOBAL_LOG.error(this.tag, 'getByDetailUrl', e);
        return reje(e);
      }
    });
  }
  removeByDetailUrl(detailUrl: string): Promise<void> {
    return super.useCursorRemove('index_detailUrl', [detailUrl]);
  }
}

const rejectAndLog = (tag: string, method: string, error: any, reje: (e: any) => void) => {
  GLOBAL_LOG.error(tag, method, error);
  return reje(error);
};

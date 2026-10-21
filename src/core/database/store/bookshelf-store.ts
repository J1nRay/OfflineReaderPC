import { isNull, isUndefined } from '../../is';
import type { BookshelfStoreEntity } from '../database';
import { BaseStoreDatabase } from './base-store';
import { useBookshelfStore } from '../../../store/bookshelf';

export class BookshelfStoreDatabase extends BaseStoreDatabase<BookshelfStoreEntity> {
  constructor(db: IDBDatabase, storeName: string) {
    super(db, storeName, 'BookshelfStoreDatabase');
  }
  /** 从数据库加载书架到内存 */
  public read() {
    const store = useBookshelfStore();
    super.getAll().then(res => {
      if (isNull(res) || res.length <= 0) return;
      this.backfillWordCount(res);
      res.forEach(entity => {
        store._books.set(entity.id, {
          id: entity.id,
          pid: entity.pid,
          detailPageUrl: entity.detailPageUrl,
          bookname: entity.bookname,
          author: entity.author,
          coverImageUrl: entity.coverImageUrl,
          latestChapterTitle: entity.latestChapterTitle,
          searchIndex: entity.searchIndex,
          readIndex: entity.readIndex,
          readChapterTitle: entity.chapterList[entity.readIndex]?.title,
          lastReadTime: entity.lastReadTime || 0,
          chapterCount: entity.chapterList?.length || 0,
          wordCount: entity.wordCount || 0,
          groupId: entity.groupId || '',
          sortIndex: entity.sortIndex || entity.timestamp,
          timestamp: entity.timestamp
        });
      });
    }).catch((e: any) => {
      GLOBAL_LOG.error(this.tag, 'read', e);
    });
  }
  /** 旧数据没有正文字数：启动时按书一次性统计并写回，避免渲染时反复读取正文 */
  private async backfillWordCount(entities: BookshelfStoreEntity[]) {
    const bookshelf = useBookshelfStore();
    for (const entity of entities) {
      if (entity.wordCount) continue;
      try {
        const contents = await GLOBAL_DB.store.textContentStore.getByPidAndDetailUrl(entity.pid, entity.detailPageUrl);
        if (isNull(contents) || contents.length <= 0) continue;
        const wordCount = contents.reduce((sum, c) => sum + c.textContent.reduce((s, p) => s + p.length, 0), 0);
        if (wordCount <= 0) continue;
        await bookshelf.updateFields(entity.id, { wordCount });
      } catch (e: any) {
        GLOBAL_LOG.error(this.tag, 'backfillWordCount', e);
      }
    }
  }
  getByPidAndDetailPageUrl(pid: string, detailPageUrl: string) {
    return new Promise<BookshelfStoreEntity | null>((reso, reje) => {
      try {
        const requ = this.db
          .transaction([this.storeName], 'readonly')
          .objectStore(this.storeName)
          .index('index_pid_url')
          .get(IDBKeyRange.only([pid, detailPageUrl]));
        requ.onsuccess = () => reso(isUndefined(requ.result) ? null : requ.result);
        requ.onerror = () => {
          GLOBAL_LOG.error(this.tag, 'getByPidAndDetailPageUrl', requ.error);
          return reje(requ.error);
        };
      } catch (e) {
        GLOBAL_LOG.error(this.tag, 'getByPidAndDetailPageUrl', e);
        return reje(e);
      }
    });
  }
  async put(val: BookshelfStoreEntity): Promise<void> {
    const _val = super.revocationProxy(val);
    const raw = await this.getByPidAndDetailPageUrl(_val.pid, _val.detailPageUrl);
    await super.put({
      ..._val,
      chapterList: _val.chapterList.map((v, i) => {
        v.index = isUndefined(v.index) ? i : v.index;
        return v;
      }),
      id: isNull(raw) ? _val.id : raw.id
    });
  }
  removeByPidAndDetailPageUrl(pid: string, detailPageUrl: string): Promise<void> {
    return this.useCursorRemove('index_pid_url', [pid, detailPageUrl]);
  }
}

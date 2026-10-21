import { isNull } from '../../is';
import type { BookGroupStoreEntity } from '../database';
import { BaseStoreDatabase } from './base-store';
import { useBookGroupStore } from '../../../store/book-group';

export class BookGroupStoreDatabase extends BaseStoreDatabase<BookGroupStoreEntity> {
  constructor(db: IDBDatabase, storeName: string) {
    super(db, storeName, 'BookGroupStoreDatabase');
    this.read();
  }
  /** 从数据库加载分组到内存 */
  private read() {
    const store = useBookGroupStore();
    super.getAll().then(res => {
      if (isNull(res) || res.length <= 0) return;
      store._groups = res;
    }).catch((e: any) => {
      GLOBAL_LOG.error(this.tag, 'read', e);
    });
  }
}

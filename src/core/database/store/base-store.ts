import { isUndefined } from '../../is';
import type { DatabaseStoreInterface } from '../database';
import { cloneByJSON } from '../../utils';

/** IndexedDB 单表基础封装 */
export class BaseStoreDatabase<T> implements DatabaseStoreInterface<T> {
  public db: IDBDatabase;
  storeName: string;
  tag: string;
  constructor(db: IDBDatabase, storeName: string, tag: string) {
    this.db = db;
    this.storeName = storeName;
    this.tag = tag;
  }
  revocationProxy<R = any>(obj: R): R {
    return cloneByJSON(obj);
  }
  getById(id: string): Promise<T | null> {
    return new Promise<T | null>((reso, reje) => {
      try {
        const requ = this.db
          .transaction([this.storeName], 'readonly')
          .objectStore(this.storeName)
          .index('index_id')
          .get(id);
        requ.onsuccess = () => reso(isUndefined(requ.result) ? null : requ.result);
        requ.onerror = () => {
          GLOBAL_LOG.error(this.tag, 'getById', id, requ.error);
          return reje(requ.error);
        };
      } catch (e) {
        GLOBAL_LOG.error(this.tag, 'getById', id, e);
        return reje(e);
      }
    });
  }
  getAll(): Promise<T[] | null> {
    return new Promise<T[] | null>((reso, reje) => {
      try {
        const requ = this.db
          .transaction([this.storeName], 'readonly')
          .objectStore(this.storeName)
          .getAll();
        requ.onsuccess = () => reso(isUndefined(requ.result) ? null : requ.result);
        requ.onerror = () => {
          GLOBAL_LOG.error(this.tag, 'getAll', requ.error);
          return reje(requ.error);
        };
      } catch (e) {
        GLOBAL_LOG.error(this.tag, 'getAll', e);
        return reje(e);
      }
    });
  }
  put(val: T, revocationProxy = true): Promise<void> {
    return new Promise<void>((reso, reje) => {
      try {
        const _val = revocationProxy ? this.revocationProxy(val) : val;
        const requ = this.db
          .transaction([this.storeName], 'readwrite')
          .objectStore(this.storeName)
          .put(_val);
        requ.onsuccess = () => reso();
        requ.onerror = () => {
          GLOBAL_LOG.error(this.tag, 'put', requ.error);
          return reje(requ.error);
        };
      } catch (e) {
        GLOBAL_LOG.error(this.tag, 'put', e);
        return reje(e);
      }
    });
  }
  remove(id: string): Promise<void> {
    return new Promise<void>((reso, reje) => {
      try {
        const requ = this.db
          .transaction([this.storeName], 'readwrite')
          .objectStore(this.storeName)
          .delete(id);
        requ.onsuccess = () => reso();
        requ.onerror = () => {
          GLOBAL_LOG.error(this.tag, 'remove', id, requ.error);
          return reje(requ.error);
        };
      } catch (e) {
        GLOBAL_LOG.error(this.tag, 'remove', e);
        return reje(e);
      }
    });
  }
  /** 清空整表 */
  clear(): Promise<void> {
    return new Promise<void>((reso, reje) => {
      try {
        const requ = this.db
          .transaction([this.storeName], 'readwrite')
          .objectStore(this.storeName)
          .clear();
        requ.onsuccess = () => reso();
        requ.onerror = () => {
          GLOBAL_LOG.error(this.tag, 'clear', requ.error);
          return reje(requ.error);
        };
      } catch (e) {
        GLOBAL_LOG.error(this.tag, 'clear', e);
        return reje(e);
      }
    });
  }
  /** 按索引游标批量删除 */
  useCursorRemove(indexName: string, keys: any[]): Promise<void> {
    return new Promise<void>((reso, reje) => {
      try {
        const requ = this.db
          .transaction([this.storeName], 'readwrite')
          .objectStore(this.storeName)
          .index(indexName)
          .openCursor(IDBKeyRange.only(keys));
        requ.onsuccess = () => {
          if (!requ.result) return reso();
          requ.result.delete();
          requ.result.continue();
        };
        requ.onerror = () => {
          GLOBAL_LOG.error(this.tag, 'useCursorRemove', indexName, ...keys, requ.error);
          return reje(requ.error);
        };
      } catch (e) {
        GLOBAL_LOG.error(this.tag, 'useCursorRemove', indexName, ...keys, e);
        return reje(e);
      }
    });
  }
}

import { isNull } from '../is';
import { newError } from '../utils';
import { BookshelfStoreDatabase } from './store/bookshelf-store';
import { BookGroupStoreDatabase } from './store/book-group-store';
import { TextContentStoreDatabase } from './store/text-content-store';
import { BookmarkStoreDatabase } from './store/bookmark-store';
import { SettingsStoreDatabase } from './store/settings-store';
import { TxtParseRuleStoreDatabase } from './store/txt-parse-rule-store';

export enum StoreName {
  BOOKSHELF = 'store_bookshelf',
  BOOK_GROUP = 'store_book_group',
  TEXT_CONTENT = 'store_text_content',
  BOOKMARK = 'store_bookmark',
  SETTINGS = 'store_settings',
  TXT_PARSE_RULE = 'store_txt_parse_rule'
}

type StoreMap = {
  bookshelfStore: BookshelfStoreDatabase;
  bookGroupStore: BookGroupStoreDatabase;
  textContentStore: TextContentStoreDatabase;
  bookmarkStore: BookmarkStoreDatabase;
  settingsStore: SettingsStoreDatabase;
  txtParseRuleStore: TxtParseRuleStoreDatabase;
};

/** 本地 IndexedDB 数据库 */
export class Database {
  public static readonly VERSION = 3;
  public static readonly NAME = 'OfflineReaderDatabase';

  private db: IDBDatabase | null = null;
  private _store: StoreMap | null = null;

  public get store(): StoreMap {
    if (isNull(this._store)) throw newError('Database store 未初始化');
    return this._store;
  }

  private initStore() {
    if (isNull(this.db)) throw newError('Database 未打开');
    if (isNull(this._store)) {
      this._store = {
        bookshelfStore: new BookshelfStoreDatabase(this.db, StoreName.BOOKSHELF),
        bookGroupStore: new BookGroupStoreDatabase(this.db, StoreName.BOOK_GROUP),
        textContentStore: new TextContentStoreDatabase(this.db, StoreName.TEXT_CONTENT),
        bookmarkStore: new BookmarkStoreDatabase(this.db, StoreName.BOOKMARK),
        settingsStore: new SettingsStoreDatabase(this.db, StoreName.SETTINGS),
        txtParseRuleStore: new TxtParseRuleStoreDatabase(this.db, StoreName.TXT_PARSE_RULE)
      };
    }
  }

  public open(version = Database.VERSION): Promise<void> {
    return new Promise<void>((reso, reje) => {
      try {
        const requ = indexedDB.open(Database.NAME, version);
        requ.onupgradeneeded = async () => {
          this.db = requ.result;
          try {
            await this.createDatabase();
          } catch (e) {
            GLOBAL_LOG.error('Database upgrade', e);
          }
        };
        requ.onsuccess = () => {
          const db = requ.result;
          // 历史升级中断可能残留“版本已提升但表未建”的状态，此时关闭并以更高版本重开以补建
          if (!this.hasAllStores(db)) {
            const next = db.version + 1;
            db.close();
            this.db = null;
            this.open(next).then(reso).catch(reje);
            return;
          }
          this.db = db;
          this.initStore();
          reso();
        };
        requ.onerror = () => {
          GLOBAL_LOG.error('Database open', requ.error);
          reje(requ.error);
        };
      } catch (e) {
        GLOBAL_LOG.error('Database open', e);
        reje(e);
      }
    });
  }

  /** 校验所有必需的表是否都存在 */
  private hasAllStores(db: IDBDatabase): boolean {
    return Object.values(StoreName).every(name => db.objectStoreNames.contains(name));
  }

  public close() {
    this.db?.close();
  }

  /** 统计本地书籍 / 正文 / 书签 / 分组数据的近似占用字节数 */
  public async getDataSize(): Promise<number> {
    if (isNull(this._store)) return 0;
    const stores = [
      this._store.bookshelfStore,
      this._store.bookGroupStore,
      this._store.textContentStore,
      this._store.bookmarkStore
    ];
    const encoder = new TextEncoder();
    let size = 0;
    for (const store of stores) {
      const list = await store.getAll();
      if (isNull(list) || list.length <= 0) continue;
      for (const item of list) size += encoder.encode(JSON.stringify(item)).length;
    }
    return size;
  }

  /** 清空书籍 / 正文 / 书签 / 分组数据（保留设置与解析规则） */
  public async clearBookData(): Promise<void> {
    if (isNull(this._store)) return;
    await Promise.all([
      this._store.bookshelfStore.clear(),
      this._store.bookGroupStore.clear(),
      this._store.textContentStore.clear(),
      this._store.bookmarkStore.clear()
    ]);
  }

  private createStore(
    storeName: string,
    storeParams: IDBObjectStoreParameters | null,
    indexes: { name: string; keyPath: string | string[]; options?: IDBIndexParameters }[] | null
  ) {
    return new Promise<void>((reso, reje) => {
      try {
        if (isNull(this.db)) throw newError('Database 未打开');
        if (this.db.objectStoreNames.contains(storeName)) return reso();
        const store = this.db.createObjectStore(storeName, isNull(storeParams) ? undefined : storeParams);
        if (!isNull(indexes)) {
          for (const idx of indexes) store.createIndex(idx.name, idx.keyPath, idx.options);
        }
        store.transaction.oncomplete = () => reso();
        store.transaction.onerror = () => {
          GLOBAL_LOG.error(`Database createStore ${storeName}`, store.transaction.error);
          reje(store.transaction.error);
        };
      } catch (e) {
        GLOBAL_LOG.error(`Database createStore ${storeName}`, e);
        reje(e);
      }
    });
  }

  private async createDatabase() {
    const unique = { unique: true };
    const stores = [
      this.createStore(StoreName.BOOKSHELF, { keyPath: 'id' }, [
        { name: 'index_id', keyPath: 'id', options: unique },
        { name: 'index_pid_url', keyPath: ['pid', 'detailPageUrl'], options: unique }
      ]),
      this.createStore(StoreName.BOOK_GROUP, { keyPath: 'id' }, [{ name: 'index_id', keyPath: 'id', options: unique }]),
      this.createStore(StoreName.TEXT_CONTENT, { keyPath: 'id' }, [
        { name: 'index_id', keyPath: 'id', options: unique },
        { name: 'index_pid_chapterUrl', keyPath: ['pid', 'chapter.url'], options: unique },
        { name: 'index_pid_detailUrl', keyPath: ['pid', 'detailUrl'], options: { unique: false } }
      ]),
      this.createStore(StoreName.BOOKMARK, { keyPath: 'id' }, [
        { name: 'index_id', keyPath: 'id', options: unique },
        { name: 'index_chapterUrl', keyPath: ['chapterUrl'], options: { unique: false } },
        { name: 'index_detailUrl', keyPath: ['detailUrl'], options: { unique: false } }
      ]),
      this.createStore(StoreName.SETTINGS, { keyPath: 'id' }, [{ name: 'index_id', keyPath: 'id', options: unique }]),
      this.createStore(StoreName.TXT_PARSE_RULE, { keyPath: 'id' }, [{ name: 'index_id', keyPath: 'id', options: unique }])
    ];
    for (const store of stores) await store;
  }
}

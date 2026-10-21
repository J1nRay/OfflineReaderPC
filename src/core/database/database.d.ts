import type { DetailEntity, Chapter } from '../book/book';
import type { TxtParserType, Pattern } from '../book/txt-parser';
import type { Settings } from '../../store/defined/settings';

export interface DatabaseStoreInterface<V> {
  db: IDBDatabase;
  storeName: string;
  getById(id: string): Promise<V | null>;
  getAll(): Promise<V[] | null>;
  put(val: V): Promise<void>;
  remove(id: string): Promise<void>;
}

export type BookshelfStoreEntity = {
  id: string;
  pid: string;
  detailPageUrl: string;
  readIndex: number;
  readScrollTop: number;
  /** 检索字段：书名 作者 */
  searchIndex: string;
  /** 最近阅读时间 */
  lastReadTime: number;
  /** 正文字数（导入时统计一次，避免渲染时重复读取正文） */
  wordCount: number;
  /** 所属分组 ID，空串表示未分组 */
  groupId: string;
  /** 手动排序序号，数值越大越靠前 */
  sortIndex: number;
  timestamp: number;
} & DetailEntity;

/** 书架分组（用户自建文件夹） */
export type BookGroupStoreEntity = {
  id: string;
  name: string;
  /** 分组在标签栏中的排序序号，数值越小越靠前 */
  sortIndex: number;
  timestamp: number;
};

export type TextContentStoreEntity = {
  id: string;
  pid: string;
  detailUrl: string;
  chapter: Chapter;
  textContent: string[];
};

export type BookmarkRange = {
  id: string;
  start: number;
  end: number;
  index: number;
  content: string;
  title: string;
  timestamp: number;
};

export type BookmarkStoreEntity = {
  id: string;
  detailUrl: string;
  chapterUrl: string;
  chapterTitle: string;
  range: BookmarkRange[];
  timestamp: number;
};

export type SettingsEntity = {
  id: string;
  use: boolean;
  settings: Settings;
};

export type TxtParseRuleEntity = {
  id: string;
  name: string;
  value: string;
  example: string;
  type: TxtParserType;
  flags: Pattern[];
};

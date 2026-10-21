import { nanoid } from 'nanoid';
import type { BookshelfStoreEntity, TextContentStoreEntity } from '../database/database';
import type { Chapter as BookChapter } from './book';
import { DEFAULT_COVER } from '../../assets/cover';
import { isUndefined } from '../is';

export type Chapter = {
  title: string;
  contents: string[];
};

type Options = {
  bookname?: string;
  author?: string;
  coverImageUrl?: string;
  intro?: string;
};

/** 书籍解析器抽象基类 */
export abstract class BookParser {
  /** 本地书籍固定 PID */
  public static readonly PID = 'LOCAL_BOOK';

  public abstract getBookName(): Promise<string>;
  public abstract getAuthor(): Promise<string>;
  public abstract getIntro(): Promise<string>;
  public abstract getCoverImageUrl(): Promise<string | undefined>;
  public abstract getChapterTitleList(): Promise<string[]>;
  public abstract getChapterList(): Promise<Chapter[]>;

  /** 转换为可入库的实体（书架 + 正文分章） */
  public async toDatabaseEntity(options?: Options): Promise<{
    bookshelf: BookshelfStoreEntity;
    textContents: TextContentStoreEntity[];
  }> {
    const bookname = isUndefined(options?.bookname) ? await this.getBookName() : options.bookname;
    const author = isUndefined(options?.author) ? await this.getAuthor() : options.author;
    const intro = isUndefined(options?.intro) ? await this.getIntro() : options.intro;
    const coverImageUrl = isUndefined(options?.coverImageUrl) ? await this.getCoverImageUrl() : options.coverImageUrl;
    const chapters = await this.getChapterList();
    const chapterList: BookChapter[] = chapters.map((c, i) => ({
      title: c.title,
      index: i,
      url: nanoid()
    }));
    const detailPageUrl = nanoid();
    const timestamp = Date.now();
    /** 正文字数：仅导入时统计一次，避免书架渲染时反复读取正文 */
    const wordCount = chapters.reduce((sum, c) => sum + c.contents.reduce((s, p) => s + p.length, 0), 0);
    const bookshelf: BookshelfStoreEntity = {
      id: nanoid(),
      pid: BookParser.PID,
      detailPageUrl,
      readIndex: -1,
      readScrollTop: 0,
      searchIndex: `${bookname} ${author}`,
      lastReadTime: 0,
      wordCount,
      groupId: '',
      sortIndex: timestamp,
      bookname,
      author,
      coverImageUrl: coverImageUrl || DEFAULT_COVER,
      intro,
      latestChapterTitle: chapterList[chapterList.length - 1]?.title,
      chapterList,
      timestamp
    };
    const textContents: TextContentStoreEntity[] = chapters.map((c, i) => ({
      id: nanoid(),
      pid: BookParser.PID,
      detailUrl: detailPageUrl,
      chapter: chapterList[i],
      textContent: c.contents
    }));

    return { bookshelf, textContents };
  }
}

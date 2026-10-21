import { BookParser, Chapter } from '../book-parser';
import ParseWorker from './worker/parse?worker';
import { newError } from '../../utils';
import { readAndDecode } from '../../../worker';
import { useSettingsStore } from '../../../store/settings';

export enum TxtParserType {
  BOOK_NAME,
  AUTHOR,
  INTRO,
  CHAPTER_LIST
}

export enum Pattern {
  IGNORE_CASE = 'i',
  MULTI_LINE = 'm',
  GLOBAL = 'g'
}

export type TxtParseRule = {
  id: string;
  name: string;
  value: string;
  example: string;
  type: TxtParserType;
  flags: Pattern[];
  builtIn?: boolean;
};

export type Rule = {
  bookname?: TxtParseRule;
  author?: TxtParseRule;
  intro?: TxtParseRule;
  chapterList?: TxtParseRule;
};

/** 无章节标题时按最大行数分割的哨兵规则 */
export const LINE_SPLIT_RULE: TxtParseRule = {
  id: 'line-split',
  name: '内置',
  type: TxtParserType.CHAPTER_LIST,
  value: '按最大行数分割',
  flags: [],
  example: '按最大行数分割',
  builtIn: true
};

type WorkerPayload =
  | { action: 'exec'; source: string; flags: string; content: string }
  | { action: 'match-all'; source: string; flags: string; content: string }
  | { action: 'chapters'; content: string; maxLines: number; chapterTitleList: string[] };

export class TxtParser extends BookParser {
  private content: string;
  private raw: Uint8Array;
  private _encoding: string;
  public rule: Rule;

  constructor(content: string, encoding: string, rule: Rule, raw: Uint8Array) {
    super();
    this.content = content;
    this._encoding = encoding;
    this.raw = raw;
    this.rule = rule;
  }

  private flags(rule: TxtParseRule) {
    return Array.from(new Set(Array.from(rule.flags.join('')))).join('');
  }

  private runWorker<T>(payload: WorkerPayload) {
    return new Promise<T>((reso, reje) => {
      try {
        const worker = new ParseWorker();
        worker.postMessage(payload);
        worker.onmessage = e => {
          const { result, error } = e.data;
          worker.terminate();
          return error ? reje(newError(error)) : reso(result as T);
        };
        worker.onerror = e => {
          worker.terminate();
          return reje(newError(e.message));
        };
      } catch (e) {
        reje(e);
      }
    });
  }

  public async getBookName() {
    if (!this.rule.bookname) return '';
    const m = await this.runWorker<string[] | null>({
      action: 'exec',
      source: this.rule.bookname.value,
      flags: this.flags(this.rule.bookname),
      content: this.content
    });
    return (m ? m[1] || m[0] : '').trim();
  }

  public async getAuthor() {
    if (!this.rule.author) return '';
    const m = await this.runWorker<string[] | null>({
      action: 'exec',
      source: this.rule.author.value,
      flags: this.flags(this.rule.author),
      content: this.content
    });
    return (m ? m[1] || m[0] : '').trim();
  }

  public async getIntro() {
    if (!this.rule.intro) return '';
    const m = await this.runWorker<string[] | null>({
      action: 'exec',
      source: this.rule.intro.value,
      flags: this.flags(this.rule.intro),
      content: this.content
    });
    return (m ? m[1] || m[0] : '').trim();
  }

  public getCoverImageUrl(): Promise<string | undefined> {
    return Promise.resolve(undefined);
  }

  public getChapterTitleList(): Promise<string[]> {
    if (!this.rule.chapterList) return Promise.resolve([]);
    if (this.rule.chapterList.id === LINE_SPLIT_RULE.id) return Promise.resolve([LINE_SPLIT_RULE.id]);
    return this.runWorker<string[]>({
      action: 'match-all',
      source: this.rule.chapterList.value,
      flags: this.flags(this.rule.chapterList),
      content: this.content
    });
  }

  public async getChapterList(): Promise<Chapter[]> {
    const { txtParse } = useSettingsStore();
    const chapterTitleList = await this.getChapterTitleList();
    return this.runWorker<Chapter[]>({
      action: 'chapters',
      content: this.content,
      maxLines: txtParse.maxLines,
      chapterTitleList
    });
  }

  public get encoding(): string {
    return this._encoding;
  }

  public async setEncoding(encoding: string) {
    const { value, encoding: _encoding } = await readAndDecode({ buffer: this.raw, encoding });
    this.content = value;
    this._encoding = _encoding;
  }

  public static load(content: string, encoding: string, rule: Rule, raw?: Uint8Array): TxtParser {
    return new TxtParser(content, encoding, rule, raw || new Uint8Array());
  }

  public static async loadFromBuffer(
    buffer: Uint8Array | ArrayBuffer,
    rule: Rule,
    encoding?: string
  ): Promise<TxtParser> {
    const res = await readAndDecode({ buffer, encoding });
    return TxtParser.load(res.value, res.encoding, rule, res.buffer);
  }

  public static async loadFromFilePath(filepath: string, rule: Rule, encoding?: string): Promise<TxtParser> {
    const res = await readAndDecode({ path: filepath, encoding });
    return TxtParser.load(res.value, res.encoding, rule, res.buffer);
  }
}

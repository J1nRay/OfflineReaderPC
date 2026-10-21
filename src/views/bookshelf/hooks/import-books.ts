import { reactive, ref } from 'vue';
import { nanoid } from 'nanoid';
import { TxtParser, TxtParserType, type Rule, type TxtParseRule } from '../../../core/book/txt-parser';
import type { BookParser } from '../../../core/book/book-parser';
import { useTxtParseRuleStore } from '../../../store/txt-parse-rules';
import { useBookshelfStore } from '../../../store/bookshelf';
import { useMessage } from '../../../hooks/message';
import { showOpenFileDialog } from '../../../core/utils/file';
import { isNull } from '../../../core/is';

/** 编码可选值 */
export const ENCODING_OPTIONS = [
  { label: '自动检测', value: 'auto' },
  { label: 'UTF-8', value: 'utf-8' },
  { label: 'GBK', value: 'gbk' },
  { label: 'GB18030', value: 'gb18030' },
  { label: 'BIG5', value: 'big5' },
  { label: 'UTF-16LE', value: 'utf-16le' },
  { label: 'UTF-16BE', value: 'utf-16be' }
];

export type ImportBook = {
  id: string;
  filename: string;
  bookname: string;
  author: string;
  intro: string;
  chapterTitleList: string[];
  chapterLength: number;
  encoding: string;
  importing: boolean;
  status: { type: 'pending' | 'fulfilled' | 'rejected'; msg?: string };
  /** 抽象基类不含私有成员，避免 Vue UnwrapRef 丢失私有字段导致的类型不兼容 */
  parser: BookParser | null;
};

/** 本地 TXT 导入流程 */
export const useImportBooks = (options?: { getTargetGroupId?: () => string }) => {
  const message = useMessage();
  const txtParseRuleStore = useTxtParseRuleStore();
  const bookshelf = useBookshelfStore();

  const visible = ref(false);
  const isLoading = ref(false);
  const books = ref<ImportBook[]>([]);
  const currentIndex = ref(0);
  const modelEncoding = ref('auto');
  const modelRule = reactive({
    bookname: '',
    author: '',
    intro: '',
    chapterList: ''
  });

  const pickRule = (id: string) => txtParseRuleStore.rules.find((r: TxtParseRule) => r.id === id) || null;

  /** 依据当前选择的规则构建解析规则集合 */
  const buildRules = (): Rule => ({
    bookname: pickRule(modelRule.bookname) || undefined,
    author: pickRule(modelRule.author) || undefined,
    intro: pickRule(modelRule.intro) || undefined,
    chapterList: pickRule(modelRule.chapterList) || undefined
  });

  /** 初始化默认规则 */
  const initDefaultRule = () => {
    const rules = txtParseRuleStore.rules;
    const first = (type: TxtParserType) => rules.find(r => r.type === type)?.id || '';
    modelRule.bookname = first(TxtParserType.BOOK_NAME);
    modelRule.author = first(TxtParserType.AUTHOR);
    modelRule.intro = first(TxtParserType.INTRO);
    modelRule.chapterList = first(TxtParserType.CHAPTER_LIST);
    modelEncoding.value = 'auto';
  };

  const previewTitles = (list: string[]) =>
    list.length > 6 ? [...list.slice(0, 3), '···', ...list.slice(-3)] : list;

  /** 解析一本书并生成待导入条目 */
  const createImportBook = async (filename: string, buffer: Uint8Array | ArrayBuffer): Promise<ImportBook> => {
    const base: ImportBook = {
      id: nanoid(),
      filename,
      bookname: '',
      author: '',
      intro: '',
      chapterTitleList: [],
      chapterLength: 0,
      encoding: '',
      importing: false,
      status: { type: 'pending' },
      parser: null
    };
    try {
      const parser = await TxtParser.loadFromBuffer(buffer, buildRules());
      const [bookname, author, intro, chapterTitleList] = await Promise.all([
        parser.getBookName().catch(() => ''),
        parser.getAuthor().catch(() => ''),
        parser.getIntro().catch(() => ''),
        parser.getChapterTitleList().catch(() => [] as string[])
      ]);
      return {
        ...base,
        bookname: bookname || filename.replace(/\.(txt|text)$/i, ''),
        author: author || '未知',
        intro,
        encoding: parser.encoding,
        parser,
        chapterLength: chapterTitleList.length,
        chapterTitleList: previewTitles(chapterTitleList)
      };
    } catch (e: any) {
      GLOBAL_LOG.error('createImportBook', filename, e);
      return { ...base, status: { type: 'rejected', msg: e?.message || String(e) } };
    }
  };

  /** 重新解析所有待导入书籍（规则/编码变更时） */
  const reparse = async () => {
    isLoading.value = true;
    try {
      for (const book of books.value) {
        const parser = book.parser as TxtParser | null;
        if (isNull(parser)) continue;
        // 同步当前选中的规则，否则更改规则后不会重新识别
        parser.rule = buildRules();
        const target = modelEncoding.value === 'auto' ? '' : modelEncoding.value;
        await parser.setEncoding(target);
        book.encoding = parser.encoding;
        book.bookname = (await parser.getBookName().catch(() => '')) || book.filename.replace(/\.(txt|text)$/i, '');
        book.author = (await parser.getAuthor().catch(() => '')) || '未知';
        book.intro = await parser.getIntro().catch(() => '');
        const titles = await parser.getChapterTitleList().catch(() => [] as string[]);
        book.chapterLength = titles.length;
        book.chapterTitleList = previewTitles(titles);
        book.status = { type: 'pending' };
      }
    } catch (e: any) {
      message.error(e?.message || String(e));
    } finally {
      isLoading.value = false;
    }
  };

  /** 添加文件到待导入列表 */
  const addFiles = async (items: { name: string; buffer: () => Promise<ArrayBuffer | Uint8Array> }[]) => {
    const files = items.filter(f => /\.(txt|text)$/i.test(f.name));
    if (files.length < 1) {
      message.warning('找不到 TXT 书籍文件');
      return;
    }
    initDefaultRule();
    isLoading.value = true;
    try {
      const list: ImportBook[] = [];
      for (const file of files) {
        list.push(await createImportBook(file.name, await file.buffer()));
      }
      books.value = list;
      currentIndex.value = 0;
      visible.value = true;
    } finally {
      isLoading.value = false;
    }
  };

  /** 打开文件选择对话框 */
  const openBookFile = () => {
    showOpenFileDialog({
      multiple: true,
      excludeAcceptAllOption: true,
      types: [{ description: 'TXT 电子书', accept: { 'text/plain': ['.txt', '.text'] } }]
    })
      .then(async handles => {
        await addFiles(handles.map(h => ({ name: h.name, buffer: () => h.buffer() })));
      })
      .catch(e => {
        if (e?.name === 'CanceledError') return;
        message.error(e?.message || String(e));
      });
  };

  /** 拖拽文件导入 */
  const fileDragChange = async (files: File[]) => {
    await addFiles(files.map(f => ({ name: f.name, buffer: () => f.arrayBuffer() })));
  };

  /** 导入单本书 */
  const importBook = async (book: ImportBook) => {
    if (isNull(book.parser)) {
      message.error('书籍解析失败，无法导入');
      return;
    }
    if (!book.bookname.trim()) {
      message.warning('请输入书名');
      return;
    }
    book.importing = true;
    try {
      const { bookshelf: entity, textContents } = await book.parser.toDatabaseEntity({
        bookname: book.bookname.trim(),
        author: book.author.trim() || '未知',
        intro: book.intro
      });
      // 在书架当前选中的分组内导入时，书籍直接归属该分组
      entity.groupId = options?.getTargetGroupId?.() || '';
      const results = await Promise.allSettled(textContents.map(t => GLOBAL_DB.store.textContentStore.put(t)));
      if (results.some(r => r.status === 'rejected')) {
        await GLOBAL_DB.store.textContentStore.removeByPidAndDetailUrl(entity.pid, entity.detailPageUrl);
        throw (results.find(r => r.status === 'rejected') as PromiseRejectedResult).reason;
      }
      await bookshelf.put(entity);
      book.status = { type: 'fulfilled' };
    } catch (e: any) {
      GLOBAL_LOG.error('importBook', book.filename, e);
      book.status = { type: 'rejected', msg: e?.message || String(e) };
    } finally {
      book.importing = false;
    }
  };

  /** 导入全部 */
  const importAll = async () => {
    if (books.value.some(b => b.importing)) {
      message.warning('正在执行导入任务');
      return;
    }
    isLoading.value = true;
    try {
      for (const book of books.value) {
        if (book.status.type === 'fulfilled') continue;
        await importBook(book);
      }
      const ok = books.value.filter(b => b.status.type === 'fulfilled').length;
      const fail = books.value.length - ok;
      if (ok > 0 && fail === 0) {
        // 全部导入成功：自动关闭导入窗口
        message.success(`成功导入 ${ok} 本书`);
        visible.value = false;
        setTimeout(() => (books.value = []), 300);
      } else if (ok > 0) {
        message.success(`成功导入 ${ok} 本书，失败 ${fail} 本`);
      } else {
        message.error('导入失败');
      }
    } finally {
      isLoading.value = false;
    }
  };

  /** 移除待导入条目 */
  const removeImportBook = (index: number) => {
    books.value.splice(index, 1);
    if (books.value.length < 1) {
      visible.value = false;
      return;
    }
    if (currentIndex.value >= books.value.length) currentIndex.value = books.value.length - 1;
  };

  const closeDialog = () => {
    if (books.value.some(b => b.importing)) {
      message.warning('正在执行本地书籍导入任务');
      return;
    }
    visible.value = false;
    setTimeout(() => (books.value = []), 300);
  };

  return {
    visible,
    isLoading,
    books,
    currentIndex,
    modelEncoding,
    modelRule,
    openBookFile,
    fileDragChange,
    reparse,
    importBook,
    importAll,
    removeImportBook,
    closeDialog
  };
};

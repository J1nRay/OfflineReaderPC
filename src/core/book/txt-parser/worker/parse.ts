/**
 * TXT 解析 Worker：
 *  - exec：单次正则匹配（保留捕获组，用于书名/作者/简介）
 *  - match-all：全局正则匹配（用于提取全部章节标题）
 *  - chapters：按章节标题切分正文；无标题时按最大行数切分
 */
const escapeRegExp = (str: string) => {
  return str
    .replaceAll('\\', '\\\\')
    .replaceAll('^', '\\^')
    .replaceAll('$', '\\$')
    .replaceAll('*', '\\*')
    .replaceAll('+', '\\+')
    .replaceAll('?', '\\?')
    .replaceAll('.', '\\.')
    .replaceAll('|', '\\|')
    .replaceAll('{', '\\{')
    .replaceAll('}', '\\}')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)')
    .replaceAll('-', '\\-');
};

const chunkArray = <T,>(array: T[], size = 1): T[][] => {
  size = Math.max(Math.ceil(Number(size)), 1);
  const length = array.length;
  if (!length) return [];
  let index = 0;
  let resIndex = 0;
  const result = new Array<T[]>(Math.ceil(length / size));
  while (index < length) {
    result[resIndex++] = array.slice(index, (index += size));
  }
  return result;
};

self.onmessage = e => {
  const { action } = e.data;
  try {
    if (action === 'exec') {
      const { source, flags, content } = e.data;
      const m = new RegExp(source, flags).exec(content);
      self.postMessage({ result: m ? Array.from(m) : null });
      return;
    }
    if (action === 'match-all') {
      const { source, flags, content } = e.data;
      self.postMessage({ result: content.match(new RegExp(source, flags)) || [] });
      return;
    }
    if (action === 'chapters') {
      let content: string = e.data.content.replaceAll('\r', '');
      const maxLines: number = e.data.maxLines || 300;
      const chapterTitleList: string[] = e.data.chapterTitleList;
      const arr: { title: string; contents: string[] }[] = [];
      let count = 1;
      // 未匹配到章节目录，以最大行数分割
      if (chapterTitleList.length === 1 && chapterTitleList[0] === 'line-split') {
        const contents = content.split('\n').map(c => c.trim()).filter(c => c);
        for (const item of chunkArray(contents, maxLines)) {
          arr.push({ title: `第${count++}章`, contents: item });
        }
      } else {
        for (let i = 0; i < chapterTitleList.length; i++) {
          let start;
          const startRegExp = new RegExp(`(${escapeRegExp(chapterTitleList[i].trim())}.*)\n`, 'gm');
          const startExec = startRegExp.exec(content);
          start = startExec ? startExec[1].length + startExec.index : -1;
          let end: number | undefined;
          if (i + 1 === chapterTitleList.length) {
            end = undefined;
          } else {
            const nextRegExp = new RegExp(`${escapeRegExp(chapterTitleList[i + 1].trim())}.*\n`, 'gm');
            const e2 = content.search(nextRegExp);
            end = e2 >= 0 ? e2 : undefined;
          }
          const contents = content.substring(start, end).split('\n').map(c => c.trim()).filter(c => c);
          content = content.slice(start);
          if (contents.length > maxLines) {
            const chunks = chunkArray(contents, maxLines);
            for (let j = 0; j < chunks.length; j++) {
              const title = j === 0 && chapterTitleList[i].trim() ? chapterTitleList[i].trim() : `第${arr.length + 1}章`;
              arr.push({ title, contents: chunks[j] });
            }
          } else {
            arr.push({ title: chapterTitleList[i].trim(), contents });
          }
        }
      }
      self.postMessage({ result: arr });
      return;
    }
    throw new Error('unknown action');
  } catch (err: any) {
    self.postMessage({ error: err.message });
  }
};

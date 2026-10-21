import fs from 'fs';
import path from 'path';

type LoggerOptions = {
  /** 是否写入日志文件 */
  enableWriteToFile: boolean;
  /** 日志保存目录 */
  savePath: string;
  /** 是否输出 debug 日志 */
  debug: boolean;
};

const format = (args: any[]) =>
  args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');

/** 轻量日志：控制台输出 + 可选落盘 */
export class Logger {
  private options: LoggerOptions;

  constructor(options: LoggerOptions) {
    this.options = options;
    if (this.options.enableWriteToFile) {
      try {
        fs.mkdirSync(this.options.savePath, { recursive: true });
      } catch {
        this.options.enableWriteToFile = false;
      }
    }
  }

  private write(level: string, args: any[]) {
    const text = `[${new Date().toISOString()}] [${level}] ${format(args)}`;
    if (this.options.enableWriteToFile) {
      const file = path.join(this.options.savePath, `${new Date().toISOString().slice(0, 10)}.log`);
      fs.appendFile(file, text + '\n', () => void 0);
    }
  }

  info(...args: any[]) {
    console.info(...args);
    this.write('INFO', args);
  }
  warn(...args: any[]) {
    console.warn(...args);
    this.write('WARN', args);
  }
  error(...args: any[]) {
    console.error(...args);
    this.write('ERROR', args);
  }
  debug(...args: any[]) {
    if (!this.options.debug) return;
    console.debug(...args);
    this.write('DEBUG', args);
  }
}

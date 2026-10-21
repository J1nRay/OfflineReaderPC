import { basename } from 'path';
import fsp from 'fs/promises';
import { readAndDecode } from '../../worker';
import { EventCode } from '../../../events';
import { newError } from '../utils';

export interface FileHandleInterface {
  name: string;
  path: string;
  text: (encoding?: string) => Promise<string>;
  buffer: () => Promise<Uint8Array>;
  size: () => Promise<number>;
}

/** 对本地文件路径的轻量封装 */
export class FileHandle implements FileHandleInterface {
  public name: string;
  public path: string;
  constructor(path: string) {
    this.name = basename(path);
    this.path = path;
  }
  async size() {
    return (await fsp.stat(this.path)).size;
  }
  async buffer() {
    const buf = await fsp.readFile(this.path);
    return Uint8Array.from(buf);
  }
  async text(encoding?: string) {
    const { value } = await readAndDecode({ path: this.path, encoding });
    return value;
  }
}

/** 打开 Electron 文件选择对话框 */
export const showOpenFileDialog = (options: OpenFilePickerOptions) => {
  return new Promise<FileHandleInterface[]>((reso, reje) => {
    GLOBAL_IPC.once(EventCode.ASYNC_SHOW_OPEN_FILE_DIALOG, (_, res) => {
      const { error, paths } = res;
      if (!error) return reso((paths as string[]).map(p => new FileHandle(p)));
      if (error === 'cancel') {
        const e = newError('cancel');
        e.name = 'CanceledError';
        return reje(e);
      }
      return reje(newError(error));
    });
    GLOBAL_IPC.send(EventCode.ASYNC_SHOW_OPEN_FILE_DIALOG, options);
  });
};

import TxtFileWorker from './txt-file?worker';

export type ReadAndDecodeOptions = {
  /** 文件路径 */
  path?: string;
  /** 原始字节（无 path 时使用） */
  buffer?: Uint8Array | ArrayBuffer;
  /** 指定编码，不传则自动检测 */
  encoding?: string;
};
export type ReadAndDecodeResult = {
  value: string;
  encoding: string;
  buffer: Uint8Array;
};

/** 在 Worker 中读取文件并解码（自动检测编码） */
export const readAndDecode = (options: ReadAndDecodeOptions) => {
  return new Promise<ReadAndDecodeResult>((reso, reje) => {
    try {
      const worker = new TxtFileWorker();
      worker.postMessage(options);
      worker.onmessage = e => {
        const { error, result, encoding, buffer } = e.data;
        worker.terminate();
        return error ? reje(new Error(error)) : reso({ value: result, encoding, buffer });
      };
      worker.onerror = e => {
        worker.terminate();
        return reje(new Error(e.message));
      };
    } catch (e: any) {
      return reje(e);
    }
  });
};

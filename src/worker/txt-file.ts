import fs from 'fs/promises';
import { decode } from 'iconv-lite';
import { detect } from 'jschardet';

/** 读取文件（或传入字节）并解码，自动检测编码 */
self.onmessage = async e => {
  try {
    const { path, buffer, encoding } = e.data;
    let buf: Buffer;
    if (path) {
      buf = await fs.readFile(path);
    } else {
      buf = Buffer.from(buffer);
    }
    let enc: string = encoding;
    if (!enc) {
      let end = Math.ceil(buf.byteLength / 1024);
      end = end < 1024 ? 1024 : end;
      enc = detect(buf.subarray(0, end)).encoding || 'utf-8';
    }
    const value = decode(buf, enc);
    self.postMessage({
      result: value,
      encoding: enc,
      buffer: Uint8Array.from(buf)
    });
  } catch (err: any) {
    self.postMessage({ error: err.message });
  }
};

import { isError, isObject, isString } from './is';

export const newError = (message?: string) => new Error(message);

export function errorHandler(error: any, toString?: false): Promise<never>;
export function errorHandler(error: any, toString: true): string;
export function errorHandler(error: any, toString: any): Promise<never> | string {
  let err: Error;
  if (isError(error)) {
    err = error;
  } else if (isString(error)) {
    err = newError(error);
  } else if (error && isString(error.message)) {
    err = newError(error.message);
  } else {
    err = newError(String(error));
  }
  GLOBAL_LOG.error('errorHandler', err);
  return toString ? err.message : Promise.reject(err);
}

/** 数组分割 */
export const chunkArray = <T>(array: T[], size = 1): T[][] => {
  size = Math.max(Math.ceil(Number(size)), 1);
  const length = array == null ? 0 : array.length;
  if (!length) return [];
  let index = 0;
  let resIndex = 0;
  const result = new Array<T[]>(Math.ceil(length / size));
  while (index < length) {
    result[resIndex++] = array.slice(index, (index += size));
  }
  return result;
};

/** 递归去除对象字符串属性的首尾空白 */
export const replaceInvisibleStr = <T extends Record<string, any>>(obj: T): T => {
  const val: any = {};
  Object.keys(obj).forEach((key: string) => {
    val[key] = isString(obj[key])
      ? obj[key].trim()
      : isObject(obj[key]) && !Array.isArray(obj[key])
        ? replaceInvisibleStr(obj[key])
        : obj[key];
  });
  return val;
};

export const cloneByJSON = <T>(val: T): T => JSON.parse(JSON.stringify(val));

export const isHexColor = (color: string) => /^#[abcdef0-9]{3,6}$/i.test(color);

/** 十六进制颜色转 RGB */
export const getColorRGB = (hexColor: string): [number, number, number] => {
  hexColor = hexColor.trim();
  if (/^#[abcdef0-9]{6}$/i.test(hexColor)) {
    return [
      Number(`0x${hexColor.substring(1, 3)}`),
      Number(`0x${hexColor.substring(3, 5)}`),
      Number(`0x${hexColor.substring(5, 7)}`)
    ];
  }
  if (/^#[abcdef0-9]{3}$/i.test(hexColor)) {
    const r = hexColor.substring(1, 2);
    const g = hexColor.substring(2, 3);
    const b = hexColor.substring(3, 4);
    return [Number(`0x${r}${r}`), Number(`0x${g}${g}`), Number(`0x${b}${b}`)];
  }
  throw newError('Not a hex color');
};

/** RGB 是否为亮色 */
export const colorIsLight = (r: number, g: number, b: number) => r * 0.299 + g * 0.578 + b * 0.114 >= 192;

/** 简易防抖 */
export const debounce = <T extends (...args: any[]) => void>(fn: T, delay: number) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    timer && clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/** HTML 转义 */
export const escapeHtml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** 简单日期格式化：支持 yyyy MM dd HH mm ss */
export const formatDate = (timestamp: number, format = 'yyyy-MM-dd HH:mm') => {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  const map: Record<string, string> = {
    yyyy: String(d.getFullYear()),
    MM: pad(d.getMonth() + 1),
    dd: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds())
  };
  return format.replace(/yyyy|MM|dd|HH|mm|ss/g, m => map[m]);
};

/** 相对时间描述 */
export const formatAgo = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  return formatDate(timestamp, 'yyyy-MM-dd');
};

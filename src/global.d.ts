import type { Logger } from './core/logger';
import type { Database } from './core/database';
import type { IpcRenderer } from './core/ipc-renderer';

declare global {
  /** 全局日志 */
  const GLOBAL_LOG: Logger;
  /** 全局数据库 */
  const GLOBAL_DB: Database;
  /** 全局 IPC */
  const GLOBAL_IPC: IpcRenderer;
  interface Window {
    GLOBAL_LOG: Logger;
    GLOBAL_DB: Database;
    GLOBAL_IPC: IpcRenderer;
  }
  const METADATA: {
    version: string;
    branch: string;
    commit: string;
    date: string;
    tag: string;
  };
}

export {};

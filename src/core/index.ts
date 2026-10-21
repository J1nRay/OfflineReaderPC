import { Logger } from './logger';
import { Database } from './database';
import { IpcRenderer } from './ipc-renderer';
import { EventCode } from '../../events';
import path from 'path';

/** 应用核心：初始化日志 / IPC / 数据库，并挂载到全局 */
export class Core {
  static logger: Logger;
  static ipc: IpcRenderer;
  static database: Database;
  static userDataPath: string | undefined;
  static isDev = false;

  public static setValue(obj: any, key: any, value: any) {
    Object.defineProperty(obj, key, {
      get: () => value,
      configurable: false
    });
  }

  public static initIpcRenderer() {
    return new Promise<void>((reso, reje) => {
      try {
        Core.setValue(Core, 'ipc', new IpcRenderer());
        Core.setValue(window, 'GLOBAL_IPC', Core.ipc);
        Core.isDev = Core.ipc.sendSync<boolean>(EventCode.SYNC_IS_DEV);
        Core.userDataPath = Core.ipc.sendSync<string>(EventCode.SYNC_GET_USER_DATA_PATH) || undefined;
        reso();
      } catch (e) {
        reje(e);
      }
    });
  }

  public static async init(): Promise<Error[] | undefined> {
    const errors: Error[] = [];
    try {
      Core.initLogger();
    } catch (e: any) {
      errors.push(e);
    }
    await Core.initDatabase().catch((e: any) => errors.push(e));
    Core.setValue(window, 'METADATA', {
      version: '1.0.0',
      branch: 'main',
      commit: '-',
      date: new Date().toISOString(),
      tag: 'offline'
    });
    GLOBAL_LOG.info('OfflineReader 初始化完成');
    return errors.length > 0 ? errors : undefined;
  }

  public static initLogger() {
    Core.setValue(Core, 'logger', new Logger({
      enableWriteToFile: !Core.isDev && !!Core.userDataPath,
      savePath: Core.userDataPath ? path.join(Core.userDataPath, 'logs') : '',
      debug: Core.isDev
    }));
    Core.setValue(window, 'GLOBAL_LOG', Core.logger);
  }

  public static async initDatabase() {
    const db = new Database();
    await db.open();
    await db.store.settingsStore.read().finally(() => db.store.settingsStore.watch());
    db.store.bookshelfStore.read();
    Core.setValue(Core, 'database', db);
    Core.setValue(window, 'GLOBAL_DB', db);
  }
}

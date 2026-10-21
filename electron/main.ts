import { app, BrowserWindow, FileFilter, ipcMain, dialog, Menu, shell } from 'electron';
import path from 'node:path';
import fs from 'fs/promises';
import { EventCode } from '../events';

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

let win: BrowserWindow | null = null;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
const icon = path.join(process.env.VITE_PUBLIC, 'icons/icon.ico');
const windowSizeConfigPath = path.join(app.getPath('userData'), 'window_size');

/** 将 FileType[] 转换为 electron 的 FileFilter[] */
const handlerTypes = (types: FileType[]): FileFilter[] => {
  const filters: FileFilter[] = [];
  for (const type of types) {
    const exts: string[] = [];
    for (const key of Object.keys(type.accept)) {
      exts.push(...type.accept[key].map(ext => (ext.startsWith('.') ? ext.slice(1) : ext)));
    }
    filters.push({ name: type.description, extensions: Array.from(new Set(exts)) });
  }
  return filters;
};

const createWindow = (width?: number, height?: number) => {
  win = new BrowserWindow({
    title: 'OfflineReader',
    width: width === undefined || width < 950 ? 950 : width,
    height: height === undefined || height < 650 ? 650 : height,
    minWidth: 720,
    minHeight: 520,
    frame: false,
    backgroundColor: '#F2F6FC',
    show: false,
    icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      spellcheck: false
    }
  });

  win.once('ready-to-show', () => win?.show());

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'));
  }

  Menu.setApplicationMenu(null);
  win.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  const send = (channel: string, ...args: any[]) => win?.webContents.send(channel, ...args);

  win.webContents.on('did-finish-load', () => send(EventCode.ASYNC_DID_FINISH_LOAD));
  win.on('maximize', () => send(EventCode.ASYNC_WINDOW_IS_MAXIMIZE, true));
  win.on('unmaximize', () => send(EventCode.ASYNC_WINDOW_IS_MAXIMIZE, false));
  win.on('enter-full-screen', () => send(EventCode.ASYNC_WINDOW_IS_FULLSCREEN, true));
  win.on('leave-full-screen', () => send(EventCode.ASYNC_WINDOW_IS_FULLSCREEN, false));
  win.on('resize', () => {
    if (!win || win.isMaximized() || win.isFullScreen()) return;
    const [w, h] = win.getSize();
    fs.writeFile(windowSizeConfigPath, JSON.stringify({ width: w, height: h }), 'utf-8').catch(() => void 0);
  });
};

const registerIpc = () => {
  ipcMain.on(EventCode.SYNC_IS_DEV, e => {
    e.returnValue = !!VITE_DEV_SERVER_URL;
  });
  ipcMain.on(EventCode.SYNC_GET_USER_DATA_PATH, e => {
    e.returnValue = app.getPath('userData');
  });
  ipcMain.on(EventCode.ASYNC_CLOSE_WINDOW, () => {
    win = null;
    app.quit();
  });
  ipcMain.on(EventCode.ASYNC_SET_WINDOW_MINIMIZE, () => win?.minimize());
  ipcMain.on(EventCode.ASYNC_SET_WINDOW_MAXIMIZE_OR_RESTORE, () => {
    if (!win) return;
    win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.on(EventCode.ASYNC_WINDOW_SET_FULLSCREEN, (_, is: boolean) => win?.setFullScreen(is));
  ipcMain.on(EventCode.ASYNC_ZOOM_WINDOW, (_, val: number) => {
    if (win && win.webContents.getZoomFactor() !== val) win.webContents.setZoomFactor(val);
  });
  ipcMain.on(EventCode.ASYNC_OPEN_DEVTOOLS, () => {
    if (win && !win.webContents.isDevToolsOpened()) win.webContents.openDevTools();
  });
  ipcMain.on(EventCode.ASYNC_OPEN_APP_DATA_FOLDER, () => {
    shell.openPath(app.getPath('userData'));
  });

  ipcMain.on(EventCode.ASYNC_SHOW_OPEN_FILE_DIALOG, (e, options: OpenFilePickerOptions) => {
    const target = BrowserWindow.fromWebContents(e.sender);
    if (!target) {
      return e.sender.send(EventCode.ASYNC_SHOW_OPEN_FILE_DIALOG, { error: 'BrowserWindow is null' });
    }
    const { multiple, excludeAcceptAllOption, types } = options;
    const properties: any[] = ['openFile'];
    multiple && properties.push('multiSelections');
    const filters = types ? handlerTypes(types) : [];
    if (!excludeAcceptAllOption || filters.length < 1) {
      filters.push({ name: '全部文件', extensions: ['*'] });
    }
    dialog.showOpenDialog(target, { properties, filters }).then(res => {
      if (res.canceled) {
        return e.sender.send(EventCode.ASYNC_SHOW_OPEN_FILE_DIALOG, { error: 'cancel' });
      }
      e.sender.send(EventCode.ASYNC_SHOW_OPEN_FILE_DIALOG, { paths: res.filePaths });
    }).catch(err => {
      e.sender.send(EventCode.ASYNC_SHOW_OPEN_FILE_DIALOG, { error: err.message });
    });
  });
};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    win.isMinimized() && win.restore();
    win.focus();
  });

  app.whenReady().then(async () => {
    registerIpc();
    try {
      const config = await fs.readFile(windowSizeConfigPath, 'utf-8');
      const { width, height } = JSON.parse(config) as { width: number; height: number };
      createWindow(width, height);
    } catch {
      createWindow();
    }
  });
}

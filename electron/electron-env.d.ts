/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /** 构建输出目录 */
    DIST: string;
    /** /dist/ 或 /public/ */
    VITE_PUBLIC: string;
  }
}

interface Window {
  ipcRenderer: import('electron').IpcRenderer;
}

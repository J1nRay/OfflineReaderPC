import { IpcRendererEvent, ipcRenderer } from 'electron';

/** 对 electron ipcRenderer 的简单封装 */
export class IpcRenderer {
  private static readonly IPC = ipcRenderer;

  addListener(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) {
    return IpcRenderer.IPC.addListener(channel, listener);
  }
  invoke(channel: string, ...args: any[]) {
    return IpcRenderer.IPC.invoke(channel, ...args);
  }
  on(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) {
    return IpcRenderer.IPC.on(channel, listener);
  }
  off(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) {
    return IpcRenderer.IPC.off(channel, listener);
  }
  once(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) {
    return IpcRenderer.IPC.once(channel, listener);
  }
  send(channel: string, ...args: any[]) {
    IpcRenderer.IPC.send(channel, ...args);
  }
  sendSync<R = any>(channel: string, ...args: any[]): R {
    return IpcRenderer.IPC.sendSync(channel, ...args) as R;
  }
}

import { defineStore } from 'pinia';
import { PagePath } from '../core/window';
import { EventCode } from '../../events';

export const useWindowStore = defineStore('Window', {
  state: () => ({
    currentPath: PagePath.BOOKSHELF as PagePath | '/settings',
    isDark: false,
    isMaximize: false,
    isFullScreen: false,
    /** 阅读进度 0~100 */
    readProgress: 0
  }),
  getters: {
    isReadPage(): boolean {
      return this.currentPath === PagePath.READ;
    }
  },
  actions: {
    calcReadProgress(el?: HTMLElement) {
      const target = el || document.getElementById('main');
      if (!target) return;
      const max = target.scrollHeight - target.clientHeight;
      this.readProgress = max > 0
        ? Math.min(100, Math.max(0, Math.round((target.scrollTop / max) * 100)))
        : 0;
    },
    setZoomFactor(factor: number) {
      GLOBAL_IPC.send(EventCode.ASYNC_ZOOM_WINDOW, factor);
    },
    setFullScreen(is: boolean) {
      GLOBAL_IPC.send(EventCode.ASYNC_WINDOW_SET_FULLSCREEN, is);
    },
    minimize() {
      GLOBAL_IPC.send(EventCode.ASYNC_SET_WINDOW_MINIMIZE);
    },
    maximizeOrRestore() {
      GLOBAL_IPC.send(EventCode.ASYNC_SET_WINDOW_MAXIMIZE_OR_RESTORE);
    },
    close() {
      GLOBAL_IPC.send(EventCode.ASYNC_CLOSE_WINDOW);
    }
  }
});

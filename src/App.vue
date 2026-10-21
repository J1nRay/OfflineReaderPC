<script lang="ts" setup>
import { nextTick, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { EventCode } from '../events';
import { PagePath } from './core/window';
import { useWindowStore } from './store/window';
import { useSettingsStore } from './store/settings';
import { useScrollTopStore } from './store/scrolltop';
import TitleBar from './components/title-bar/index.vue';
import Message from './components/message/index.vue';
import BackTop from './components/backtop/index.vue';

const route = useRoute();
const router = useRouter();
const win = useWindowStore();
const settings = useSettingsStore();
const scrollTopStore = useScrollTopStore();
const { currentPath } = storeToRefs(win);

const TITLE_MAP: Record<string, string> = {
  [PagePath.BOOKSHELF]: '书架',
  [PagePath.DETAIL]: '书籍详情',
  [PagePath.READ]: '阅读',
  [PagePath.HISTORY]: '最近阅读',
  '/settings': '设置'
};

let raf = 0;
const onScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  scrollTopStore.setScrollTop(currentPath.value, target.scrollTop);
  // 阅读页由页面自身计算进度（支持整本/按章节两种模式）
  if (currentPath.value === PagePath.READ) return;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => win.calcReadProgress(target));
};

const onMaximize = (_: unknown, is: boolean) => (win.isMaximize = is);
const onFullScreen = (_: unknown, is: boolean) => (win.isFullScreen = is);

router.afterEach(to => {
  win.currentPath = to.path as PagePath | '/settings';
  document.title = `${TITLE_MAP[to.path] || 'OfflineReader'} - OfflineReader`;
  nextTick(() => scrollTopStore.pageScrollTop(<PagePath>to.path));
});

onMounted(() => {
  settings.setTheme(settings.theme);
  win.setZoomFactor(settings.window.zoomFactor);
  scrollTopStore.mainElement?.addEventListener('scroll', onScroll, { passive: true });
  GLOBAL_IPC.on(EventCode.ASYNC_WINDOW_IS_MAXIMIZE, onMaximize);
  GLOBAL_IPC.on(EventCode.ASYNC_WINDOW_IS_FULLSCREEN, onFullScreen);
});

onUnmounted(() => {
  scrollTopStore.mainElement?.removeEventListener('scroll', onScroll);
  GLOBAL_IPC.off(EventCode.ASYNC_WINDOW_IS_MAXIMIZE, onMaximize);
  GLOBAL_IPC.off(EventCode.ASYNC_WINDOW_IS_FULLSCREEN, onFullScreen);
});

// 路由初始化时也需要设置一次标题
document.title = `${TITLE_MAP[route.path] || 'OfflineReader'} - OfflineReader`;
</script>

<template>
  <div id="app" class="rc-scrollbar">
    <TitleBar />
    <div id="main">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </div>
    <BackTop v-if="settings.options.enableReadBacktop" :threshold="500" />
    <Message />
  </div>
</template>

<style scoped lang="scss">
#app {
  position: relative;
}
</style>

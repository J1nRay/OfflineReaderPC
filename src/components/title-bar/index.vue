<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useWindowStore } from '../../store/window';
import { PagePath } from '../../core/window';
import Icon from '../icon/index.vue';

const router = useRouter();
const { isMaximize, isFullScreen, currentPath } = storeToRefs(useWindowStore());
const { minimize, maximizeOrRestore, close, setFullScreen } = useWindowStore();

const NAVS: { path: PagePath | '/settings'; label: string; icon: string }[] = [
  { path: PagePath.BOOKSHELF, label: '书架', icon: 'book' },
  { path: PagePath.HISTORY, label: '最近阅读', icon: 'history' },
  { path: '/settings', label: '设置', icon: 'settings' }
];

const go = (path: string) => router.push(path);
</script>

<template>
  <header class="rc-title-bar rc-drag-region">
    <div class="rc-title-bar-logo rc-no-drag">
      <Icon name="book-open" :size="20" />
      <span class="rc-title-bar-name">OfflineReader</span>
    </div>

    <nav class="rc-title-bar-nav rc-no-drag">
      <button
        v-for="nav in NAVS"
        :key="nav.path"
        :class="['rc-nav-item', currentPath === nav.path ? 'active' : '']"
        @click="go(nav.path)"
      >
        <Icon :name="nav.icon" :size="15" />
        <span>{{ nav.label }}</span>
      </button>
    </nav>

    <div class="rc-title-bar-actions rc-no-drag">
      <button class="rc-win-btn" title="全屏" @click="setFullScreen(!isFullScreen)">
        <Icon :name="isFullScreen ? 'compress' : 'fullscreen'" :size="15" />
      </button>
      <button class="rc-win-btn" title="最小化" @click="minimize">
        <Icon name="minimize" :size="15" />
      </button>
      <button class="rc-win-btn" title="最大化/还原" @click="maximizeOrRestore">
        <Icon :name="isMaximize ? 'restore' : 'maximize'" :size="14" />
      </button>
      <button class="rc-win-btn close" title="关闭" @click="close">
        <Icon name="close" :size="15" />
      </button>
    </div>
  </header>
</template>

<style scoped lang="scss">
.rc-title-bar {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  height: var(--rc-title-bar-height);
  padding-left: 14px;
  border-bottom: 1px solid var(--rc-border);
  background-color: var(--rc-header-color);
}

.rc-title-bar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--rc-primary);

  .rc-title-bar-name {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.3px;
    color: var(--rc-text);
  }
}

.rc-title-bar-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 28px;
}

.rc-nav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 6px;
  color: var(--rc-text-secondary);
  transition: all 0.2s ease;

  &:hover {
    background-color: var(--rc-hover);
    color: var(--rc-text);
  }
  &.active {
    background-color: var(--rc-primary);
    color: #fff;
  }
}

.rc-title-bar-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
  height: 100%;
}

.rc-win-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 100%;
  color: var(--rc-text-secondary);
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background-color: var(--rc-hover);
    color: var(--rc-text);
  }
  &.close:hover {
    background-color: var(--rc-danger);
    color: #fff;
  }
}
</style>

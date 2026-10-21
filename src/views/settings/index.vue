<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { EventCode } from '../../../events';
import { TxtParserType, type TxtParseRule } from '../../core/book/txt-parser';
import { useSettingsStore } from '../../store/settings';
import { useTxtParseRuleStore } from '../../store/txt-parse-rules';
import { useWindowStore } from '../../store/window';
import { useBookshelfStore } from '../../store/bookshelf';
import { useBookGroupStore } from '../../store/book-group';
import { useBookmarkStore } from '../../store/bookmark';
import { useTextContentStore } from '../../store/text-content';
import { useDetailStore } from '../../store/detail';
import { useMessage } from '../../hooks/message';
import Icon from '../../components/icon/index.vue';
import RcButton from '../../components/button/index.vue';
import Dialog from '../../components/dialog/index.vue';
import ParseRuleDialog from '../../components/parse-rule-dialog/index.vue';

const message = useMessage();
const settings = useSettingsStore();
const windowStore = useWindowStore();
const txtParseRuleStore = useTxtParseRuleStore();
const { rules } = storeToRefs(txtParseRuleStore);

const typeOptions = [
  { label: '书名', value: TxtParserType.BOOK_NAME },
  { label: '作者', value: TxtParserType.AUTHOR },
  { label: '简介', value: TxtParserType.INTRO },
  { label: '章节列表', value: TxtParserType.CHAPTER_LIST }
];

const typeName = (type: TxtParserType) => typeOptions.find(t => t.value === type)?.label || '-';

/* 解析规则新增 / 编辑 */
const ruleDialogVisible = ref(false);
const ruleDialogRule = ref<TxtParseRule | null>(null);

const openAdd = () => {
  ruleDialogRule.value = null;
  ruleDialogVisible.value = true;
};

const openEdit = (rule: TxtParseRule) => {
  ruleDialogRule.value = rule;
  ruleDialogVisible.value = true;
};

const removeRule = async (id: string) => {
  await txtParseRuleStore.remove(id);
  message.success('规则已删除');
};

/* 主题 */
const themeOptions = [
  { label: '跟随系统', value: 'os' },
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' }
] as const;

const changeTheme = (value: string) => settings.setTheme(value as 'os' | 'light' | 'dark');

/* 缩放 */
const changeZoom = () => windowStore.setZoomFactor(settings.window.zoomFactor);

/* 开发者 */
const openDevtools = () => GLOBAL_IPC.send(EventCode.ASYNC_OPEN_DEVTOOLS);

/* 关于 */
const appVersion = METADATA.version;

/* 数据与存储 */
const dataPath = GLOBAL_IPC.sendSync<string>(EventCode.SYNC_GET_USER_DATA_PATH) || '';
const dataSize = ref(0);
const sizeLoading = ref(false);
const clearDialogVisible = ref(false);
const clearing = ref(false);

const formatSize = (bytes: number) => {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
};

const refreshDataSize = async () => {
  if (sizeLoading.value) return;
  sizeLoading.value = true;
  try {
    dataSize.value = await GLOBAL_DB.getDataSize();
  } catch (e: any) {
    GLOBAL_LOG.error('SettingsView getDataSize', e);
  } finally {
    sizeLoading.value = false;
  }
};

const openDataFolder = () => GLOBAL_IPC.send(EventCode.ASYNC_OPEN_APP_DATA_FOLDER);

const clearCache = async () => {
  if (clearing.value) return;
  clearing.value = true;
  try {
    await GLOBAL_DB.clearBookData();
    // 同步清空内存中的书籍、分组、书签与阅读状态
    useBookshelfStore()._books.clear();
    useBookGroupStore()._groups = [];
    useBookmarkStore()._bookmarks.clear();
    const textContent = useTextContentStore();
    textContent.textContent = null;
    textContent.currentChapter = null;
    const detail = useDetailStore();
    detail.detailResult = null;
    detail.currentPid = null;
    detail.currentDetailUrl = null;
    detail.currentReadIndex = -1;
    detail.currentReadScrollTop = { chapterIndex: -1, scrollTop: 0 };
    windowStore.readProgress = 0;
    clearDialogVisible.value = false;
    await refreshDataSize();
    message.success('缓存已清空');
  } catch (e: any) {
    message.error(e?.message || '清空缓存失败');
  } finally {
    clearing.value = false;
  }
};

onMounted(refreshDataSize);
</script>

<template>
  <div class="settings-view">
    <div class="rc-page-header">
      <span class="rc-page-title">设置</span>
    </div>

    <section class="settings-section">
      <h3 class="settings-section-title">外观</h3>
      <div class="settings-row">
        <span class="settings-row-label">主题</span>
        <div class="settings-row-control">
          <button v-for="t in themeOptions" :key="t.value" :class="['settings-choice', settings.theme === t.value ? 'active' : '']" @click="changeTheme(t.value)">
            {{ t.label }}
          </button>
        </div>
      </div>
      <div class="settings-row">
        <span class="settings-row-label">界面缩放</span>
        <div class="settings-row-control">
          <input v-model.number="settings.window.zoomFactor" class="settings-range" type="range" min="0.6" max="1.6" step="0.05" @change="changeZoom" />
          <span class="settings-value">{{ Math.round(settings.window.zoomFactor * 100) }}%</span>
        </div>
      </div>
    </section>

    <section class="settings-section">
      <h3 class="settings-section-title">阅读</h3>
      <div class="settings-row">
        <span class="settings-row-label">快捷键滚动步进</span>
        <div class="settings-row-control">
          <input v-model.number="settings.scrollbarStepValue" class="rc-input settings-number" type="number" min="50" step="10" />
          <span class="settings-unit">px</span>
        </div>
      </div>
      <div class="settings-row">
        <span class="settings-row-label">显示回到顶部按钮</span>
        <div class="settings-row-control">
          <label class="settings-switch">
            <input v-model="settings.options.enableReadBacktop" type="checkbox" />
            <span />
          </label>
        </div>
      </div>
      <div class="settings-row">
        <span class="settings-row-label">章节内书签高亮</span>
        <div class="settings-row-control">
          <label class="settings-switch">
            <input v-model="settings.options.enableBookmarkHighlight" type="checkbox" />
            <span />
          </label>
        </div>
      </div>
      <div class="settings-row">
        <span class="settings-row-label">滚动到顶/底切换章节</span>
        <div class="settings-row-control">
          <label class="settings-switch">
            <input v-model="settings.options.enableScrollToggleChapter" type="checkbox" />
            <span />
          </label>
        </div>
      </div>
    </section>

    <section class="settings-section">
      <h3 class="settings-section-title">数据与存储</h3>
      <div class="settings-row">
        <span class="settings-row-label">存储位置</span>
        <div class="settings-row-control settings-storage-control">
          <span class="settings-path rc-ellipsis" :title="dataPath">{{ dataPath || '-' }}</span>
          <RcButton size="small" icon="folder" :disabled="!dataPath" @click="openDataFolder">打开目录</RcButton>
        </div>
      </div>
      <div class="settings-row">
        <span class="settings-row-label">已用数据</span>
        <div class="settings-row-control">
          <span class="settings-size">{{ sizeLoading ? '统计中…' : formatSize(dataSize) }}</span>
          <RcButton size="small" :disabled="sizeLoading" @click="refreshDataSize">重新统计</RcButton>
        </div>
      </div>
      <div class="settings-row">
        <span class="settings-row-label">清空缓存</span>
        <div class="settings-row-control">
          <RcButton size="small" type="danger" @click="clearDialogVisible = true">清空缓存</RcButton>
        </div>
      </div>
      <p class="settings-hint">清空后已导入的书籍、章节正文、书签与分组将被删除，设置与解析规则会保留。</p>
    </section>

    <section class="settings-section">
      <h3 class="settings-section-title">TXT 解析</h3>
      <div class="settings-row">
        <span class="settings-row-label">单章最大行数</span>
        <div class="settings-row-control">
          <input v-model.number="settings.txtParse.maxLines" class="rc-input settings-number" type="number" min="50" step="10" />
          <span class="settings-unit">行</span>
        </div>
      </div>
      <p class="settings-hint">未匹配到章节标题时，按该行数把正文切分为多个章节。</p>

      <div class="settings-rules-header">
        <span class="settings-row-label">章节解析规则</span>
        <RcButton size="small" icon="plus" @click="openAdd">新增规则</RcButton>
      </div>
      <ul class="settings-rules">
        <li v-for="rule in rules" :key="rule.id" class="settings-rule">
          <div class="settings-rule-main">
            <div class="settings-rule-head">
              <span class="settings-rule-name">{{ rule.name }}</span>
              <span class="settings-rule-type">{{ typeName(rule.type) }}</span>
              <span v-if="rule.builtIn" class="settings-rule-tag">内置</span>
            </div>
            <code class="settings-rule-value rc-ellipsis" :title="rule.value">{{ rule.value }}</code>
            <span class="settings-rule-example">示例：{{ rule.example }}</span>
          </div>
          <div v-if="!rule.builtIn" class="settings-rule-actions">
            <button class="settings-icon-btn" title="编辑" @click="openEdit(rule)">
              <Icon name="edit" :size="14" />
            </button>
            <button class="settings-icon-btn danger" title="删除" @click="removeRule(rule.id)">
              <Icon name="trash" :size="14" />
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section class="settings-section">
      <h3 class="settings-section-title">开发者</h3>
      <div class="settings-row">
        <span class="settings-row-label">调试模式</span>
        <div class="settings-row-control">
          <label class="settings-switch">
            <input v-model="settings.debug" type="checkbox" />
            <span />
          </label>
        </div>
      </div>
      <div class="settings-row">
        <span class="settings-row-label">开发者工具</span>
        <div class="settings-row-control">
          <RcButton size="small" @click="openDevtools">打开控制台</RcButton>
        </div>
      </div>
    </section>

    <section class="settings-section">
      <h3 class="settings-section-title">关于</h3>
      <div class="settings-about-card">
        <div class="settings-about-logo">
          <Icon name="book-open" :size="26" />
        </div>
        <div class="settings-about-main">
          <div class="settings-about-head">
            <span class="settings-about-name">OfflineReader</span>
            <span class="settings-about-version">v{{ appVersion }}</span>
          </div>
          <p class="settings-about-desc">免费、开源、轻量、纯净、无广告的本地离线阅读器</p>
          <div class="settings-about-tags">
            <span class="settings-about-tag">本地 TXT 导入</span>
            <span class="settings-about-tag">无需联网</span>
          </div>
        </div>
      </div>
      <div class="settings-about-footer">
        <span>作者：DeepSeek-V4.1-Flash &amp; JinRay</span>
      </div>
    </section>

    <ParseRuleDialog v-model="ruleDialogVisible" :rule="ruleDialogRule" />

    <Dialog v-model="clearDialogVisible" title="清空缓存" width="400px" confirm-text="清空" @confirm="clearCache">
      <p class="settings-clear-tip">将删除所有已导入的书籍、章节正文、书签与分组数据，删除后无法恢复。</p>
      <p class="settings-clear-tip">设置与解析规则不受影响。</p>
    </Dialog>
  </div>
</template>

<style scoped lang="scss">
.settings-view {
  min-height: 100%;
  padding-bottom: 50px;
}

.settings-section {
  margin: 0 28px 20px;
  padding: 18px 20px;
  border: 1px solid var(--rc-border);
  border-radius: 10px;
  background-color: var(--rc-panel);
}

.settings-section-title {
  margin-bottom: 14px;
  font-size: 15px;
  font-weight: 600;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 40px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--rc-border);

  &:last-child {
    border-bottom: none;
  }
}

.settings-row-label {
  font-size: 13.5px;
  color: var(--rc-text);
}

.settings-row-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.settings-hint {
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--rc-text-secondary);
}

.settings-choice {
  padding: 6px 14px;
  border: 1px solid var(--rc-border);
  border-radius: 6px;
  color: var(--rc-text-secondary);
  font-size: 13px;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--rc-primary);
    color: var(--rc-primary);
  }
  &.active {
    border-color: var(--rc-primary);
    background-color: rgba(30, 120, 235, 0.08);
    color: var(--rc-primary);
  }
}

.settings-range {
  width: 220px;
  accent-color: var(--rc-primary);
  cursor: pointer;
}

.settings-value {
  width: 46px;
  font-size: 12.5px;
  color: var(--rc-text-secondary);
  text-align: right;
}

.settings-number {
  width: 90px;
}

.settings-unit {
  font-size: 12.5px;
  color: var(--rc-text-secondary);
}

.settings-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;

  input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: relative;
    width: 42px;
    height: 22px;
    border-radius: 11px;
    background-color: var(--rc-border);
    transition: background-color 0.25s ease;

    &::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background-color: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
      transition: transform 0.25s ease;
    }
  }

  input:checked + span {
    background-color: var(--rc-primary);
    &::after {
      transform: translateX(20px);
    }
  }
}

.settings-rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0 10px;
}

.settings-rules {
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
}

.settings-rule {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--rc-border);
  border-radius: 8px;
  background-color: var(--rc-panel-2);
}

.settings-rule-main {
  flex: 1;
  min-width: 0;
}

.settings-rule-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-rule-name {
  font-size: 13.5px;
  font-weight: 600;
}

.settings-rule-type,
.settings-rule-tag {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11.5px;
}

.settings-rule-type {
  background-color: var(--rc-hover);
  color: var(--rc-text-secondary);
}

.settings-rule-tag {
  background-color: rgba(30, 120, 235, 0.12);
  color: var(--rc-primary);
}

.settings-rule-value {
  display: block;
  margin-top: 6px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  color: var(--rc-text-secondary);
  user-select: text;
}

.settings-rule-example {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--rc-text-secondary);
}

.settings-rule-actions {
  display: flex;
  gap: 6px;
}

.settings-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--rc-border);
  border-radius: 6px;
  background-color: var(--rc-panel);
  color: var(--rc-text-secondary);
  transition: all 0.2s ease;

  &:hover {
    color: var(--rc-primary);
    border-color: var(--rc-primary);
  }
  &.danger:hover {
    color: #fff;
    background-color: var(--rc-danger);
    border-color: var(--rc-danger);
  }
}

.settings-about-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px;
  border: 1px solid var(--rc-border);
  border-radius: var(--rc-radius);
  background-image: linear-gradient(135deg, rgba(30, 120, 235, 0.09), rgba(30, 120, 235, 0.01));
}

.settings-about-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background-color: var(--rc-primary);
  color: #fff;
  box-shadow: 0 6px 16px rgba(30, 120, 235, 0.28);
}

.settings-about-main {
  min-width: 0;
}

.settings-about-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-about-name {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.settings-about-version {
  padding: 1px 8px;
  border: 1px solid var(--rc-border);
  border-radius: 999px;
  background-color: var(--rc-panel);
  font-size: 11.5px;
  color: var(--rc-text-secondary);
}

.settings-about-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--rc-text-secondary);
}

.settings-about-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.settings-about-tag {
  padding: 2px 10px;
  border: 1px solid var(--rc-border);
  border-radius: 999px;
  background-color: var(--rc-panel);
  font-size: 12px;
  color: var(--rc-text-secondary);
}

.settings-about-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--rc-border);
  font-size: 12.5px;
  color: var(--rc-text-secondary);
}

.settings-storage-control {
  flex: 1;
  min-width: 0;
  justify-content: flex-end;
}

.settings-path {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  color: var(--rc-text-secondary);
  user-select: text;
}

.settings-size {
  min-width: 64px;
  font-size: 13px;
  font-weight: 600;
  color: var(--rc-primary);
  text-align: right;
}

.settings-clear-tip {
  font-size: 13px;
  line-height: 1.7;
  color: var(--rc-text-secondary);

  & + & {
    margin-top: 4px;
  }
}
</style>

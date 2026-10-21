<script lang="ts" setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '../../../store/settings';
import { Font } from '../../../core/font';
import { DefaultReadColor } from '../../../core/window/default-read-style';
import Icon from '../../../components/icon/index.vue';
import NumberStepper from '../../../components/number-stepper/index.vue';

defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>();

const settings = useSettingsStore();
const { readStyle, options } = storeToRefs(settings);

const colors = DefaultReadColor.getAll();
const fonts = Font.all;

const close = () => emit('update:visible', false);
const setColor = (id: string) => settings.setDefaultReadColorById(id);
const setFont = (id: string) => {
  const font = Font.get(id);
  if (font) settings.setFont(font);
};

const currentFontId = computed(() => readStyle.value.font.id);

/** 正文宽度以百分比展示 */
const widthPercent = computed({
  get: () => Math.round(readStyle.value.width * 100),
  set: (value: number) => {
    readStyle.value.width = value / 100;
  }
});
</script>

<template>
  <Transition name="rc-panel">
    <aside v-if="visible" class="read-settings">
      <header class="read-settings-header">
        <span>阅读设置</span>
        <button class="read-settings-close" title="关闭" @click="close">
          <Icon name="close" :size="15" />
        </button>
      </header>

      <div class="read-settings-body rc-scrollbar">
        <section class="rs-section">
          <p class="rs-title">字体</p>
          <select class="rc-select-control rs-font-select" :value="currentFontId" @change="setFont(($event.target as HTMLSelectElement).value)">
            <option v-for="f in fonts" :key="f.id" :value="f.id">{{ f.fullName }}</option>
          </select>
        </section>

        <section class="rs-section">
          <div class="rs-row">
            <span class="rc-label">字体大小</span>
            <NumberStepper v-model="readStyle.fontSize" :min="12" :max="34" :step="0.5" :precision="1" unit="px" />
          </div>
          <div class="rs-row">
            <span class="rc-label">行间距</span>
            <NumberStepper v-model="readStyle.lineSpacing" :min="1.2" :max="3.5" :step="0.1" :precision="1" />
          </div>
          <div class="rs-row">
            <span class="rc-label">段落间距</span>
            <NumberStepper v-model="readStyle.sectionSpacing" :min="0" :max="40" :step="1" unit="px" />
          </div>
          <div class="rs-row">
            <span class="rc-label">字间距</span>
            <NumberStepper v-model="readStyle.letterSpacing" :min="0" :max="6" :step="0.1" :precision="1" unit="px" />
          </div>
          <div class="rs-row">
            <span class="rc-label">正文宽度</span>
            <NumberStepper v-model="widthPercent" :min="50" :max="100" :step="1" unit="%" />
          </div>
          <div class="rs-row">
            <span class="rc-label">字体粗细</span>
            <div class="rs-toggle">
              <button :class="['rs-toggle-btn', readStyle.fontWeight === 'normal' ? 'active' : '']" @click="readStyle.fontWeight = 'normal'">
                常规
              </button>
              <button :class="['rs-toggle-btn', readStyle.fontWeight === 'bold' ? 'active' : '']" @click="readStyle.fontWeight = 'bold'">
                加粗
              </button>
            </div>
          </div>
        </section>

        <section class="rs-section">
          <p class="rs-title">背景配色</p>
          <div class="rs-colors">
            <button v-for="c in colors" :key="c.id" :class="['rs-color', readStyle.background.id === c.id ? 'active' : '']" :style="{ backgroundColor: c.backgroundColor, color: c.textColor }" :title="c.name" @click="setColor(c.id)">
              <Icon v-if="readStyle.background.id === c.id" name="check" :size="14" />
            </button>
          </div>
        </section>

        <section class="rs-section">
          <p class="rs-title">亮度</p>
          <div class="rs-row">
            <span class="rc-label">亮度模式</span>
            <div class="rs-toggle">
              <button :class="['rs-toggle-btn', options.followSystemBrightness ? 'active' : '']" @click="options.followSystemBrightness = true">
                跟随系统
              </button>
              <button :class="['rs-toggle-btn', !options.followSystemBrightness ? 'active' : '']" @click="options.followSystemBrightness = false">
                手动
              </button>
            </div>
          </div>
          <div class="rs-row">
            <span class="rc-label">亮度</span>
            <NumberStepper v-model="options.brightness" :min="40" :max="100" :step="1" unit="%" :disabled="options.followSystemBrightness" />
          </div>
          <label class="rs-switch">
            <input v-model="options.enableEyeCare" type="checkbox" />
            <span>护眼模式</span>
          </label>
        </section>

        <section class="rs-section">
          <p class="rs-title">其他</p>
          <label class="rs-switch">
            <input v-model="options.enableReadBacktop" type="checkbox" />
            <span>显示「回到顶部」按钮</span>
          </label>
          <label class="rs-switch">
            <input v-model="options.enableBookmarkHighlight" type="checkbox" />
            <span>书签高亮</span>
          </label>
          <label class="rs-switch">
            <input v-model="options.enableScrollToggleChapter" type="checkbox" />
            <span>滚动到顶/底切换章节</span>
          </label>
          <label class="rs-switch">
            <input v-model="options.enableChapterProgress" type="checkbox" />
            <span>阅读进度按当前章节计算</span>
          </label>
        </section>

        <section class="rs-section">
          <p class="rs-title">自动阅读</p>
          <div class="rs-row">
            <span class="rc-label">滚动速度</span>
            <NumberStepper v-model="options.autoReadSpeed" :min="10" :max="200" :step="5" unit="px/s" />
          </div>
        </section>

        <section class="rs-section">
          <p class="rs-title">快捷键</p>
          <ul class="rs-keys">
            <li><kbd>←</kbd> / <kbd>→</kbd> 上一章 / 下一章</li>
            <li><kbd>↑</kbd> / <kbd>↓</kbd> 向上 / 向下滚动</li>
            <li><kbd>Space</kbd> 下一页</li>
            <li><kbd>Esc</kbd> 关闭本面板</li>
          </ul>
        </section>
      </div>
    </aside>
  </Transition>
</template>

<style scoped lang="scss">
.read-settings {
  position: fixed;
  top: var(--rc-title-bar-height);
  right: 0;
  bottom: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  width: 300px;
  border-left: 1px solid var(--rc-border);
  background-color: var(--rc-panel);
  box-shadow: -6px 0 22px rgba(0, 0, 0, 0.1);
}

.read-settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid var(--rc-border);
  font-size: 14px;
  font-weight: 600;
}

.read-settings-close {
  display: flex;
  align-items: center;
  color: var(--rc-text-secondary);
  &:hover {
    color: var(--rc-danger);
  }
}

.read-settings-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.rs-section {
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--rc-border);

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
}

.rs-title {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--rc-text-secondary);
}

.rs-font-select {
  width: 100%;
}

.rs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;

  .rc-label {
    width: 58px;
    flex-shrink: 0;
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.rs-toggle {
  display: flex;
  gap: 8px;
}
.rs-toggle-btn {
  padding: 4px 12px;
  border: 1px solid var(--rc-border);
  border-radius: 6px;
  color: var(--rc-text-secondary);
  font-size: 12.5px;

  &.active {
    border-color: var(--rc-primary);
    color: var(--rc-primary);
    background-color: rgba(30, 120, 235, 0.08);
  }
}

.rs-colors {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
  gap: 10px;
}

.rs-color {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  border: 2px solid var(--rc-border);
  border-radius: 8px;
  font-size: 11px;
  transition: transform 0.15s ease;

  &:hover {
    transform: translateY(-2px);
  }
  &.active {
    border-color: var(--rc-primary);
  }
}

.rs-switch {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 11px;
  font-size: 13px;
  cursor: pointer;

  input {
    width: 15px;
    height: 15px;
    accent-color: var(--rc-primary);
    cursor: pointer;
  }
}

.rs-keys {
  list-style: none;
  li {
    margin-bottom: 8px;
    font-size: 12.5px;
    color: var(--rc-text-secondary);
  }
  kbd {
    display: inline-block;
    min-width: 20px;
    padding: 1px 5px;
    border: 1px solid var(--rc-border);
    border-radius: 4px;
    background-color: var(--rc-panel-2);
    font-family: inherit;
    font-size: 11.5px;
    text-align: center;
  }
}

.rc-panel-enter-active,
.rc-panel-leave-active {
  transition: transform 0.24s ease, opacity 0.24s ease;
}
.rc-panel-enter-from,
.rc-panel-leave-to {
  transform: translateX(100%);
  opacity: 0.4;
}
</style>

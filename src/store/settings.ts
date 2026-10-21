import { defineStore } from 'pinia';
import { DefaultReadColor, type ReadBackground } from '../core/window/default-read-style';
import type { Settings, SettingsTheme } from './defined/settings';
import { nanoid } from 'nanoid';
import { useWindowStore } from './window';
import { cloneByJSON, newError, isHexColor } from '../core/utils';
import { Font, type FontData } from '../core/font';

export const useSettingsStore = defineStore('Settings', {
  state: (): Settings => ({
    id: nanoid(),
    options: {
      enableReadBacktop: true,
      enableTransition: true,
      enableScrollToggleChapter: false,
      enableAutoTextColor: false,
      enableShowTipCloseButton: false,
      enableBookmarkHighlight: true,
      autoReadSpeed: 30,
      enableChapterProgress: true,
      followSystemBrightness: true,
      brightness: 100,
      enableEyeCare: false
    },
    readStyle: {
      background: DefaultReadColor.GREEN_QINGCAO,
      fontSize: 17.5,
      fontWeight: 'normal',
      letterSpacing: 1.5,
      font: Font.default,
      sectionSpacing: 13,
      lineSpacing: 2,
      width: 0.8
    },
    theme: 'os',
    scrollbarStepValue: 300,
    window: { zoomFactor: 1 },
    txtParse: { maxLines: 300 },
    debug: false
  }),
  getters: {
    backgroundColor(): string {
      return this.readStyle.background.backgroundColor;
    },
    textColor(): string {
      return this.readStyle.background.textColor;
    },
    bookmarkColorEven(): string {
      return this.readStyle.background.bookmarkColor.even;
    },
    bookmarkColorOdd(): string {
      return this.readStyle.background.bookmarkColor.odd;
    },
    fontSize(): string {
      return this.readStyle.fontSize + 'px';
    },
    fontWeight(): string {
      return this.readStyle.fontWeight;
    },
    letterSpacing(): string {
      return this.readStyle.letterSpacing + 'px';
    },
    fontFamily(): string {
      return this.readStyle.font.family;
    },
    fontName(): string {
      return this.readStyle.font.fullName;
    },
    sectionSpacing(): string {
      return this.readStyle.sectionSpacing + 'px';
    },
    lineSpacing(): number {
      return this.readStyle.lineSpacing;
    },
    width(): string {
      return this.readStyle.width * 100 + '%';
    }
  },
  actions: {
    setBackgroundColor(color: string) {
      if (!isHexColor(color)) throw newError('不是合法的十六进制颜色');
      this.readStyle.background.backgroundColor = color;
    },
    setTextColor(color: string) {
      if (!isHexColor(color)) throw newError('不是合法的十六进制颜色');
      this.readStyle.background.textColor = color;
    },
    setReadColor(color: ReadBackground) {
      this.readStyle.background = cloneByJSON(color);
    },
    setDefaultReadColorById(id: string) {
      const color = DefaultReadColor.get(id);
      if (!color) throw newError('配色不存在');
      this.setReadColor(color);
    },
    setFont(font: FontData) {
      this.readStyle.font = cloneByJSON(font);
    },
    setTheme(theme: SettingsTheme) {
      let dark = false;
      switch (theme) {
        case 'os':
          dark = matchMedia('(prefers-color-scheme: dark)').matches;
          break;
        case 'light':
          dark = false;
          break;
        case 'dark':
          dark = true;
          break;
      }
      dark
        ? document.documentElement.classList.add('dark')
        : document.documentElement.classList.remove('dark');
      this.theme = theme;
      useWindowStore().isDark = dark;
    }
  }
});

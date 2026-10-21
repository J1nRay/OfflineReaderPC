import type { ReadBackground } from '../../core/window/default-read-style';
import type { FontData } from '../../core/font';

export type SettingsOptions = {
  /** 阅读界面回到顶部 */
  enableReadBacktop: boolean;
  /** 过渡动画 */
  enableTransition: boolean;
  /** 滚动至顶/底部切换上/下一章节 */
  enableScrollToggleChapter: boolean;
  /** 文本颜色自适应（仅阅读模式） */
  enableAutoTextColor: boolean;
  /** 显示消息提示框关闭按钮 */
  enableShowTipCloseButton: boolean;
  /** 书签高亮 */
  enableBookmarkHighlight: boolean;
  /** 自动阅读滚动速度（像素/秒） */
  autoReadSpeed: number;
  /** 阅读进度按当前章节计算（每章从 0 开始） */
  enableChapterProgress: boolean;
  /** 亮度跟随系统（不额外降低亮度） */
  followSystemBrightness: boolean;
  /** 手动亮度 40~100 */
  brightness: number;
  /** 护眼模式 */
  enableEyeCare: boolean;
};

export type SettingsReadStyle = {
  /** 阅读背景 */
  background: ReadBackground;
  /** 字体大小 */
  fontSize: number;
  /** 字体粗细 */
  fontWeight: 'normal' | 'bold';
  /** 字间距 */
  letterSpacing: number;
  /** 字体 */
  font: FontData;
  /** 段落间距 */
  sectionSpacing: number;
  /** 行间距 */
  lineSpacing: number;
  /** 正文宽度比例 0~1 */
  width: number;
};

export type SettingsTheme = 'os' | 'light' | 'dark';
export type WindowConfig = { zoomFactor: number };
export type TxtParseConfig = { maxLines: number };

export type Settings = {
  id: string;
  options: SettingsOptions;
  readStyle: SettingsReadStyle;
  theme: SettingsTheme;
  /** 快捷键滚动步进值 */
  scrollbarStepValue: number;
  window: WindowConfig;
  /** TXT 解析配置 */
  txtParse: TxtParseConfig;
  debug: boolean;
};

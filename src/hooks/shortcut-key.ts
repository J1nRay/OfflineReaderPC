import { onMounted, onUnmounted } from 'vue';

export type ShortcutHandler = (e: KeyboardEvent) => void;

/** 组合键字符串，如 "ctrl+ArrowUp"、"ArrowLeft"、"shift+ctrl+d" */
const buildCombo = (e: KeyboardEvent) => {
  const keys: string[] = [];
  if (e.ctrlKey || e.metaKey) keys.push('ctrl');
  if (e.shiftKey) keys.push('shift');
  if (e.altKey) keys.push('alt');
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys.push(key);
  return keys.join('+');
};

const isEditable = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
};

/**
 * 注册键盘快捷键
 * @param handlers 组合键 -> 处理函数
 * @param preventDefaultKeys 需要阻止默认行为的组合键
 */
export const useShortcutKey = (
  handlers: Record<string, ShortcutHandler>,
  preventDefaultKeys: string[] = []
) => {
  const listener = (e: KeyboardEvent) => {
    if (isEditable(e.target)) return;
    const combo = buildCombo(e);
    const handler = handlers[combo];
    if (!handler) return;
    if (preventDefaultKeys.includes(combo)) e.preventDefault();
    handler(e);
  };

  onMounted(() => window.addEventListener('keydown', listener));
  onUnmounted(() => window.removeEventListener('keydown', listener));
};

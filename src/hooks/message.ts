import { reactive } from 'vue';

export type MessageType = 'success' | 'warning' | 'error' | 'info';
export type MessageItem = { id: number; type: MessageType; text: string };

const state = reactive({ messages: [] as MessageItem[] });
let uid = 0;

const push = (type: MessageType, text: string, duration = 3000) => {
  const id = ++uid;
  state.messages.push({ id, type, text });
  setTimeout(() => {
    const i = state.messages.findIndex(m => m.id === id);
    if (i >= 0) state.messages.splice(i, 1);
  }, duration);
  return id;
};

/** 全局消息提示 */
export const useMessage = () => ({
  success: (text: string) => push('success', text),
  warning: (text: string) => push('warning', text),
  error: (text: string) => push('error', text),
  info: (text: string) => push('info', text)
});

export const useMessageState = () => state;

import { defineStore } from 'pinia';

/** 各页面搜索关键词 */
export const useSearchStore = defineStore('Search', {
  state: () => ({
    keywords: {} as Record<string, string>
  }),
  actions: {
    get(path: string) {
      return this.keywords[path] || '';
    },
    set(path: string, keyword: string) {
      this.keywords[path] = keyword;
    }
  }
});

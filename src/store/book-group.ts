import { defineStore } from 'pinia';
import { nanoid } from 'nanoid';
import type { BookGroupStoreEntity } from '../core/database/database';
import { cloneByJSON, errorHandler, newError, replaceInvisibleStr } from '../core/utils';

/** 书架分组（用户自建文件夹） */
export type BookGroup = BookGroupStoreEntity;

export const useBookGroupStore = defineStore('BookGroup', {
  state: () => ({
    _groups: [] as BookGroup[]
  }),
  getters: {
    /** 按 sortIndex 升序 */
    groups(): BookGroup[] {
      return [...this._groups].sort((a, b) => a.sortIndex - b.sortIndex);
    }
  },
  actions: {
    async put(entity: BookGroupStoreEntity): Promise<void> {
      try {
        const _entity = cloneByJSON(replaceInvisibleStr(entity));
        if (!_entity.id.trim()) throw newError('ID 为空');
        if (!_entity.name.trim()) throw newError('分组名称为空');
        await GLOBAL_DB.store.bookGroupStore.put(_entity, false);
        const i = this._groups.findIndex(v => v.id === _entity.id);
        if (i >= 0) this._groups[i] = _entity;
        else this._groups.push(_entity);
      } catch (e: any) {
        return errorHandler(e);
      }
    },
    /** 新建分组 */
    async create(name: string): Promise<BookGroup | null> {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const maxSort = this._groups.reduce((max, g) => Math.max(max, g.sortIndex), 0);
      const entity: BookGroup = {
        id: nanoid(),
        name: trimmed,
        sortIndex: maxSort + 1,
        timestamp: Date.now()
      };
      await this.put(entity);
      return this._groups.find(g => g.id === entity.id) || null;
    },
    /** 重命名分组 */
    async rename(id: string, name: string): Promise<void> {
      const target = this._groups.find(g => g.id === id);
      if (!target) return;
      await this.put({ ...target, name: name.trim() });
    },
    async remove(id: string): Promise<void> {
      try {
        const i = this._groups.findIndex(v => v.id === id);
        if (i < 0) return;
        await GLOBAL_DB.store.bookGroupStore.remove(id);
        this._groups.splice(i, 1);
      } catch (e: any) {
        return errorHandler(e);
      }
    }
  }
});

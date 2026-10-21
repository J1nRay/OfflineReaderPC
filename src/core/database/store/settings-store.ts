import { isNull, isUndefined } from '../../is';
import type { SettingsEntity } from '../database';
import { BaseStoreDatabase } from './base-store';
import { debounce } from '../../utils';
import { useSettingsStore } from '../../../store/settings';
import type { Settings } from '../../../store/defined/settings';

export class SettingsStoreDatabase extends BaseStoreDatabase<SettingsEntity> {
  constructor(db: IDBDatabase, storeName: string) {
    super(db, storeName, 'SettingsStoreDatabase');
  }

  /** 读取设置并应用到 store */
  public async read() {
    const all = await super.getAll();
    if (isNull(all) || all.length <= 0) return;
    const use = all.find(v => v.use);
    if (isUndefined(use)) return;
    const settings = useSettingsStore();
    settings.$patch(use.settings);
    settings.setTheme(use.settings.theme);
  }

  /** 监听设置变更并持久化（防抖） */
  public watch() {
    const debo = debounce((state: Settings) => {
      super.put({ id: state.id, use: true, settings: state }).catch(e => {
        GLOBAL_LOG.error(this.tag, 'watch', e);
      });
    }, 3 * 1000);
    useSettingsStore().$subscribe((_, state) => {
      debo(super.revocationProxy(state));
    }, { deep: true });
  }
}

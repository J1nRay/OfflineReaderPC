import { isNull } from '../../is';
import type { TxtParseRuleEntity } from '../database';
import { BaseStoreDatabase } from './base-store';
import { useTxtParseRuleStore } from '../../../store/txt-parse-rules';

export class TxtParseRuleStoreDatabase extends BaseStoreDatabase<TxtParseRuleEntity> {
  constructor(db: IDBDatabase, storeName: string) {
    super(db, storeName, 'TxtParseRuleStoreDatabase');
    this.read();
  }
  private read() {
    const store = useTxtParseRuleStore();
    super.getAll().then(res => {
      if (isNull(res) || res.length <= 0) return;
      store._rules = res;
    }).catch((e: any) => {
      GLOBAL_LOG.error(this.tag, 'read', e);
    });
  }
}

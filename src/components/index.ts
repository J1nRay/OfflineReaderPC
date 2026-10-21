import type { App, Component } from 'vue';

import Icon from './icon/index.vue';
import Message from './message/index.vue';
import Loading from './loading/index.vue';
import TitleBar from './title-bar/index.vue';
import BackTop from './backtop/index.vue';
import GoBack from './go-back/index.vue';
import Menu from './menu/index.vue';
import MenuItem from './menu/item.vue';
import Dialog from './dialog/index.vue';
import Pagination from './pagination/index.vue';
import SearchInput from './search-input/index.vue';
import RcButton from './button/index.vue';
import Select from './select/index.vue';
import ParseRuleDialog from './parse-rule-dialog/index.vue';
import Text from './text/index.vue';

export {
  Icon,
  Message,
  Loading,
  TitleBar,
  BackTop,
  GoBack,
  Menu,
  MenuItem,
  Dialog,
  Pagination,
  SearchInput,
  RcButton,
  Select,
  ParseRuleDialog,
  Text
};

const components: Record<string, Component> = {
  RcIcon: Icon,
  RcMessage: Message,
  RcLoading: Loading,
  RcTitleBar: TitleBar,
  RcBackTop: BackTop,
  RcGoBack: GoBack,
  RcMenu: Menu,
  RcMenuItem: MenuItem,
  RcDialog: Dialog,
  RcPagination: Pagination,
  RcSearchInput: SearchInput,
  RcButton,
  RcSelect: Select,
  RcText: Text
};

/** 全局注册所有轻量组件 */
export const installComponents = (app: App) => {
  Object.keys(components).forEach(name => app.component(name, components[name]));
};

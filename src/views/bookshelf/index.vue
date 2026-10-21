<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { PagePath } from '../../core/window';
import { useBookshelfStore, type Book } from '../../store/bookshelf';
import { useBookGroupStore, type BookGroup } from '../../store/book-group';
import { useBookmarkStore } from '../../store/bookmark';
import { useTxtParseRuleStore } from '../../store/txt-parse-rules';
import { TxtParserType, type TxtParseRule } from '../../core/book/txt-parser';
import { useDefaultPagination } from '../../hooks/default-pagination';
import { useMessage } from '../../hooks/message';
import { useImportBooks, ENCODING_OPTIONS, type ImportBook } from './hooks/import-books';
import { DEFAULT_COVER } from '../../assets/cover';
import Icon from '../../components/icon/index.vue';
import RcButton from '../../components/button/index.vue';
import RcSelect from '../../components/select/index.vue';
import ParseRuleDialog from '../../components/parse-rule-dialog/index.vue';
import SearchInput from '../../components/search-input/index.vue';
import Pagination from '../../components/pagination/index.vue';
import Dialog from '../../components/dialog/index.vue';

const router = useRouter();
const message = useMessage();
const bookshelf = useBookshelfStore();
const bookGroupStore = useBookGroupStore();
const { removeBookmarksByDetailUrl } = useBookmarkStore();
const { rules } = storeToRefs(useTxtParseRuleStore());
const { groups } = storeToRefs(bookGroupStore);

const keyword = ref('');

/* ============ 分组 ============ */
/** all = 全部，none = 未分组，其余为分组 ID */
type GroupKey = 'all' | 'none' | string;
const activeGroup = ref<GroupKey>('all');
/** 导入书籍时应归属的分组：查看全部/未分组时视为未分组 */
const importTargetGroupId = () =>
  activeGroup.value === 'all' || activeGroup.value === 'none' ? '' : activeGroup.value;

const {
  visible: importVisible,
  isLoading,
  books: importBooks,
  modelEncoding,
  modelRule,
  openBookFile,
  fileDragChange,
  reparse,
  importAll,
  removeImportBook,
  closeDialog
} = useImportBooks({ getTargetGroupId: importTargetGroupId });

const groupBooks = computed<Book[]>(() => {
  const all = bookshelf.books;
  if (activeGroup.value === 'all') return all;
  if (activeGroup.value === 'none') return all.filter(b => !b.groupId);
  return all.filter(b => b.groupId === activeGroup.value);
});

const ungroupedCount = computed(() => bookshelf.books.filter(b => !b.groupId).length);
const groupBookCount = (id: string) => bookshelf.books.filter(b => b.groupId === id).length;

const { currentPage, total, totalPage, pages } = useDefaultPagination<Book>({
  source: groupBooks,
  pageSize: 24,
  keyword,
  filter: (book, kw) => book.searchIndex.toLowerCase().includes(kw)
});

const selectGroup = (key: GroupKey) => {
  activeGroup.value = key;
  currentPage.value = 1;
};

/** 正被拖拽书籍悬停的分组标签 */
const dragOverGroup = ref<GroupKey | null>(null);

const emptyText = computed(() => {
  if (keyword.value) return '没有匹配的书籍';
  if (activeGroup.value === 'none') return '「未分组」下暂无书籍';
  if (activeGroup.value !== 'all') return '该分组暂无书籍';
  return '书架还是空的';
});

/* 以“示例”作为主文案，避免多条内置规则在列表中难以区分 */
const ruleOptions = (type: TxtParserType) =>
  rules.value
    .filter(r => r.type === type)
    .map(r => ({ label: r.example || r.name, value: r.id, description: r.name }));

/* 新增解析规则 */
const ruleDialogVisible = ref(false);
const onRuleSaved = (rule: TxtParseRule) => {
  if (rule.type === TxtParserType.CHAPTER_LIST) modelRule.chapterList = rule.id;
  else if (rule.type === TxtParserType.BOOK_NAME) modelRule.bookname = rule.id;
  else if (rule.type === TxtParserType.AUTHOR) modelRule.author = rule.id;
  else if (rule.type === TxtParserType.INTRO) modelRule.intro = rule.id;
  reparse();
};

/* ============ 卡片统计展示 ============ */
const readTitle = (book: Book) =>
  book.readIndex < 0 ? '尚未阅读' : book.readChapterTitle || book.latestChapterTitle || '暂无章节';

const progressOf = (book: Book) => {
  if (!book.chapterCount || book.readIndex < 0) return 0;
  return Math.min(100, Math.round(((book.readIndex + 1) / book.chapterCount) * 100));
};

const formatWords = (count: number) => {
  if (!count) return '字数未知';
  return count >= 10000 ? `${(count / 10000).toFixed(1)} 万字` : `${count} 字`;
};

/* ============ 拖拽：排序 / 建分组 ============ */
type DragMode = 'merge' | 'before' | 'after';
const dragState = reactive<{ book: Book | null; targetId: string; mode: DragMode }>({
  book: null,
  targetId: '',
  mode: 'merge'
});

const resetDrag = () => {
  dragState.book = null;
  dragState.targetId = '';
  dragState.mode = 'merge';
};

const onCardDragStart = (book: Book, e: DragEvent) => {
  dragOver.value = false;
  dragState.book = book;
  dragState.targetId = '';
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', book.id);
  }
};

const onCardDragEnd = () => {
  resetDrag();
  dragOverGroup.value = null;
};

/** 依据指针在卡片上的位置判定：中央区域=合并为分组，左侧=插入到前面，右侧=插入到后面 */
const onCardDragOver = (book: Book, e: DragEvent) => {
  const dragged = dragState.book;
  if (!dragged || dragged.id === book.id) return;
  e.preventDefault();
  e.stopPropagation();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  const inCenter = x >= 0.3 && x <= 0.7 && y >= 0.3 && y <= 0.7;
  dragState.targetId = book.id;
  dragState.mode = inCenter ? 'merge' : x < 0.5 ? 'before' : 'after';
};

/** 拖到网格空白处时清除卡片指示 */
const onGridDragOver = (e: DragEvent) => {
  if (!dragState.book) return;
  if (e.target === e.currentTarget) dragState.targetId = '';
};

const onCardDrop = async (book: Book, e: DragEvent) => {
  const dragged = dragState.book;
  const mode = dragState.mode;
  const valid = !!dragged && dragged.id !== book.id && dragState.targetId === book.id;
  resetDrag();
  if (!valid || !dragged) return;
  e.preventDefault();
  e.stopPropagation();
  if (mode === 'merge') openMergeGroup(dragged, book);
  else await reorderBook(dragged, book, mode);
};

/** 在目标书目前 / 之后插入，仅改动被拖拽书目的排序序号 */
const reorderBook = async (dragged: Book, target: Book, mode: 'before' | 'after') => {
  if (keyword.value.trim()) {
    message.warning('搜索状态下不支持拖拽排序，请先清空搜索关键词');
    return;
  }
  const rest = bookshelf.books.filter(b => b.id !== dragged.id);
  const ti = rest.findIndex(b => b.id === target.id);
  if (ti < 0) return;
  let sortIndex: number;
  if (mode === 'before') {
    const prev = rest[ti - 1];
    sortIndex = prev ? (prev.sortIndex + target.sortIndex) / 2 : target.sortIndex + 1000;
  } else {
    const next = rest[ti + 1];
    sortIndex = next ? (target.sortIndex + next.sortIndex) / 2 : target.sortIndex - 1000;
  }
  await bookshelf.setSortIndex(dragged.id, sortIndex);
};

/* ============ 拖拽书籍到分组标签：切换分组 ============ */
const onGroupDragOver = (key: GroupKey, e: DragEvent) => {
  if (!dragState.book) return;
  e.preventDefault();
  e.stopPropagation();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  dragOverGroup.value = key;
};

const onGroupDragLeave = (key: GroupKey, e: DragEvent) => {
  const el = e.currentTarget as HTMLElement;
  if (e.relatedTarget && el.contains(e.relatedTarget as Node)) return;
  if (dragOverGroup.value === key) dragOverGroup.value = null;
};

/** 拖到「未分组」= 移出分组；拖到某个分组标签 = 移入该分组 */
const onGroupDrop = async (key: GroupKey, e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  const book = dragState.book;
  dragOverGroup.value = null;
  resetDrag();
  if (!book) return;
  const groupId = key === 'all' || key === 'none' ? '' : key;
  if ((book.groupId || '') === groupId) return;
  await bookshelf.moveToGroup([book.id], groupId);
  message.success(groupId ? '已移入该分组' : '已移出分组');
};

/* ============ 分组的创建 / 重命名 / 删除 ============ */
const groupDialogVisible = ref(false);
const groupDialogMode = ref<'create' | 'rename' | 'merge'>('create');
const groupNameInput = ref('');
const renameTarget = ref<BookGroup | null>(null);
const mergeBooks = ref<Book[] | null>(null);

const groupDialogTitle = computed(() => {
  if (groupDialogMode.value === 'rename') return '重命名分组';
  if (groupDialogMode.value === 'merge') return '合并为新分组';
  return '新建文件夹';
});

const nameExists = (name: string, excludeId = '') =>
  groups.value.some(g => g.name === name && g.id !== excludeId);

const resetGroupDialog = () => {
  renameTarget.value = null;
  mergeBooks.value = null;
  groupNameInput.value = '';
};

const openCreateGroup = () => {
  resetGroupDialog();
  groupDialogMode.value = 'create';
  groupDialogVisible.value = true;
};

const openRenameGroup = (group: BookGroup) => {
  resetGroupDialog();
  groupDialogMode.value = 'rename';
  renameTarget.value = group;
  groupNameInput.value = group.name;
  groupDialogVisible.value = true;
};

const openMergeGroup = (a: Book, b: Book) => {
  resetGroupDialog();
  groupDialogMode.value = 'merge';
  mergeBooks.value = [a, b];
  groupNameInput.value = '新建分组';
  groupDialogVisible.value = true;
};

const closeGroupDialog = () => {
  groupDialogVisible.value = false;
  resetGroupDialog();
};

const confirmGroup = async () => {
  const name = groupNameInput.value.trim();
  if (!name) {
    message.warning('请输入分组名称');
    return;
  }
  if (groupDialogMode.value === 'rename' && renameTarget.value) {
    if (nameExists(name, renameTarget.value.id)) {
      message.warning('已存在同名分组');
      return;
    }
    await bookGroupStore.rename(renameTarget.value.id, name);
    message.success('分组已重命名');
  } else {
    if (nameExists(name)) {
      message.warning('已存在同名分组');
      return;
    }
    const group = await bookGroupStore.create(name);
    if (!group) {
      message.error('分组创建失败');
      return;
    }
    if (groupDialogMode.value === 'merge' && mergeBooks.value) {
      await bookshelf.moveToGroup(mergeBooks.value.map(b => b.id), group.id);
      message.success(`已创建分组「${name}」并移入 2 本书`);
    } else {
      message.success(`已创建分组「${name}」`);
    }
  }
  closeGroupDialog();
};

const deleteGroupTarget = ref<BookGroup | null>(null);
const askDeleteGroup = (group: BookGroup) => (deleteGroupTarget.value = group);
const confirmDeleteGroup = async () => {
  const group = deleteGroupTarget.value;
  deleteGroupTarget.value = null;
  if (!group) return;
  const ids = bookshelf.books.filter(b => b.groupId === group.id).map(b => b.id);
  await bookshelf.moveToGroup(ids, '');
  await bookGroupStore.remove(group.id);
  if (activeGroup.value === group.id) activeGroup.value = 'none';
  message.success('分组已删除，组内书籍已移至未分组');
};

/* ============ 拖拽导入 TXT ============ */
const dragOver = ref(false);
/** 仅当拖入的是外部文件时才显示导入遮罩，避免拖拽书卡时误触发 */
const isFileDrag = (e: DragEvent) => !!e.dataTransfer && e.dataTransfer.types.includes('Files');

const onDragOver = (e: DragEvent) => {
  if (dragState.book || !isFileDrag(e)) return;
  e.preventDefault();
  dragOver.value = true;
};
const onDragLeave = (e: DragEvent) => {
  const self = e.currentTarget as HTMLElement | null;
  if (self && e.relatedTarget && self.contains(e.relatedTarget as Node)) return;
  dragOver.value = false;
};
const onDrop = async (e: DragEvent) => {
  if (!isFileDrag(e)) return;
  e.preventDefault();
  dragOver.value = false;
  const files = Array.from(e.dataTransfer?.files || []);
  if (files.length > 0) await fileDragChange(files);
};

const openDetail = (book: Book) => {
  router.push({ path: PagePath.DETAIL, query: { pid: book.pid, detailUrl: book.detailPageUrl } });
};

/* 删除书籍 */
const deleteTarget = ref<Book | null>(null);
const askDelete = (book: Book) => (deleteTarget.value = book);
const confirmDelete = async () => {
  const book = deleteTarget.value;
  deleteTarget.value = null;
  if (!book) return;
  await Promise.all([
    GLOBAL_DB.store.textContentStore.removeByPidAndDetailUrl(book.pid, book.detailPageUrl),
    removeBookmarksByDetailUrl(book.detailPageUrl)
  ]);
  await bookshelf.remove(book.id);
};

const statusText = (book: ImportBook) => {
  if (book.status.type === 'fulfilled') return '已导入';
  if (book.status.type === 'rejected') return book.status.msg || '解析失败';
  return `${book.chapterLength} 章`;
};

const goRead = (book: Book) => router.push({ path: PagePath.DETAIL, query: { pid: book.pid, detailUrl: book.detailPageUrl } });
</script>

<template>
  <div class="bookshelf-view" @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop">
    <div class="rc-page-header">
      <div>
        <span class="rc-page-title">书架</span>
        <span class="rc-page-subtitle">共 {{ total }} 本</span>
      </div>
      <div class="rc-page-header-actions">
        <SearchInput v-model="keyword" placeholder="搜索书名 / 作者" width="240px" />
        <RcButton type="primary" icon="plus" @click="openBookFile">导入书籍</RcButton>
      </div>
    </div>

    <!-- 分组标签栏 -->
    <div class="group-bar">
      <button :class="['group-tab', activeGroup === 'all' ? 'active' : '']" @click="selectGroup('all')">
        <Icon name="list" :size="14" />
        <span>全部</span>
        <span class="group-tab-count">{{ bookshelf.books.length }}</span>
      </button>
      <button
        :class="['group-tab', activeGroup === 'none' ? 'active' : '', dragOverGroup === 'none' ? 'drag-over' : '']"
        title="把书籍拖到这里可移出分组"
        @click="selectGroup('none')"
        @dragover="onGroupDragOver('none', $event)"
        @dragleave="onGroupDragLeave('none', $event)"
        @drop="onGroupDrop('none', $event)"
      >
        <Icon name="book" :size="14" />
        <span>未分组</span>
        <span class="group-tab-count">{{ ungroupedCount }}</span>
      </button>
      <div v-for="group in groups" :key="group.id" class="group-tab-wrap">
        <button
          :class="['group-tab', activeGroup === group.id ? 'active' : '', dragOverGroup === group.id ? 'drag-over' : '']"
          title="把书籍拖到这里可移入该分组"
          @click="selectGroup(group.id)"
          @dragover="onGroupDragOver(group.id, $event)"
          @dragleave="onGroupDragLeave(group.id, $event)"
          @drop="onGroupDrop(group.id, $event)"
        >
          <Icon name="folder" :size="14" />
          <span class="rc-ellipsis">{{ group.name }}</span>
          <span class="group-tab-count">{{ groupBookCount(group.id) }}</span>
        </button>
        <span class="group-tab-tools">
          <button class="group-tool" title="重命名" @click.stop="openRenameGroup(group)">
            <Icon name="edit" :size="13" />
          </button>
          <button class="group-tool danger" title="删除分组" @click.stop="askDeleteGroup(group)">
            <Icon name="trash" :size="13" />
          </button>
        </span>
      </div>
      <RcButton class="group-add" size="small" icon="plus" @click="openCreateGroup">新建文件夹</RcButton>
    </div>

    <div v-if="pages.length > 0" class="book-grid" @dragover="onGridDragOver">
      <div v-for="book in pages" :key="book.id" :class="[
          'book-card',
          dragState.book?.id === book.id ? 'is-dragging' : '',
          dragState.targetId === book.id ? `drop-${dragState.mode}` : ''
        ]" draggable="true" @click="openDetail(book)" @dragstart="onCardDragStart(book, $event)" @dragend="onCardDragEnd" @dragover="onCardDragOver(book, $event)" @drop="onCardDrop(book, $event)">
        <div class="book-cover">
          <img :src="book.coverImageUrl || DEFAULT_COVER" :alt="book.bookname" draggable="false" />
          <span v-if="dragState.targetId === book.id && dragState.mode === 'merge'" class="merge-hint">
            <Icon name="folder" :size="16" />
            合并为分组
          </span>
        </div>
        <span v-if="dragState.targetId === book.id && dragState.mode !== 'merge'" :class="['drop-line', dragState.mode]" />
        <div class="book-info">
          <p class="book-name rc-ellipsis" :title="book.bookname">{{ book.bookname }}</p>
          <p class="book-author rc-ellipsis">{{ book.author || '未知作者' }}</p>
          <p class="book-meta rc-ellipsis" :title="readTitle(book)">
            <em class="meta-tag last">上次</em>{{ readTitle(book) }}
          </p>
          <p class="book-meta rc-ellipsis" :title="book.latestChapterTitle || '暂无章节'">
            <em class="meta-tag latest">最终</em>{{ book.latestChapterTitle || '暂无章节' }}
          </p>
          <div class="book-progress" :title="`已读 ${progressOf(book)}%`">
            <span class="book-progress-bar"><i :style="{ width: `${progressOf(book)}%` }" /></span>
            <span class="book-progress-text">{{ progressOf(book) }}%</span>
          </div>
          <p class="book-stat">
            <span>{{ book.chapterCount }} 章</span>
            <span class="book-stat-dot">·</span>
            <span>{{ formatWords(book.wordCount) }}</span>
          </p>
          <div class="book-actions">
            <button class="book-action" title="开始阅读" @click.stop="goRead(book)">
              <Icon name="book-open" :size="14" />
            </button>
            <button class="book-action danger" title="移出书架" @click.stop="askDelete(book)">
              <Icon name="trash" :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="rc-empty">
      <Icon :name="activeGroup === 'all' ? 'book' : 'folder'" :size="46" />
      <p>{{ emptyText }}</p>
      <p class="rc-empty-tip">点击「导入书籍」选择本地 TXT 文件，或直接把文件拖拽到此处</p>
      <RcButton type="primary" icon="plus" @click="openBookFile">导入书籍</RcButton>
    </div>

    <div class="pagination-wrap">
      <Pagination v-model="currentPage" :total-page="totalPage" @change="() => {}" />
    </div>

    <Transition name="rc-fade">
      <div v-if="dragOver" class="drag-mask">
        <Icon name="folder" :size="52" />
        <p>松开鼠标导入 TXT 书籍</p>
      </div>
    </Transition>

    <!-- 分组新建 / 重命名 -->
    <Dialog v-model="groupDialogVisible" :title="groupDialogTitle" width="380px" :confirm-text="groupDialogMode === 'rename' ? '保存' : '创建'" @close="resetGroupDialog" @confirm="confirmGroup">
      <input v-model="groupNameInput" class="rc-input group-name-input" placeholder="请输入分组名称" @keyup.enter="confirmGroup" />
      <p class="group-name-tip">创建分组后，可把书籍拖到标签栏查看，也可拖拽一本书到另一本书上快速建组。</p>
    </Dialog>

    <!-- 删除分组确认 -->
    <Dialog :model-value="!!deleteGroupTarget" title="删除分组" width="380px" confirm-text="删除" @update:model-value="deleteGroupTarget = null" @confirm="confirmDeleteGroup">
      确定要删除分组「{{ deleteGroupTarget?.name }}」吗？组内书籍不会被删除，将移回「未分组」。
    </Dialog>

    <!-- 导入对话框 -->
    <Dialog v-model="importVisible" title="导入本地书籍" width="680px" @close="closeDialog">
      <div class="import-panel">
        <div class="import-rules">
          <div class="rc-field-row">
            <span class="rc-label">章节规则</span>
            <RcSelect v-model="modelRule.chapterList" :options="ruleOptions(TxtParserType.CHAPTER_LIST)" @change="reparse" />
            <span class="rc-label">文本编码</span>
            <RcSelect v-model="modelEncoding" :options="ENCODING_OPTIONS" @change="reparse" />
          </div>
          <div class="rc-field-row">
            <span class="rc-label">书名规则</span>
            <RcSelect v-model="modelRule.bookname" :options="ruleOptions(TxtParserType.BOOK_NAME)" @change="reparse" />
            <span class="rc-label">作者规则</span>
            <RcSelect v-model="modelRule.author" :options="ruleOptions(TxtParserType.AUTHOR)" @change="reparse" />
          </div>
        </div>

        <ul class="import-list rc-scrollbar">
          <li v-for="(book, index) in importBooks" :key="book.id" class="import-item">
            <div class="import-item-head">
              <span class="import-item-file rc-ellipsis" :title="book.filename">{{ book.filename }}</span>
              <span :class="['import-item-status', book.status.type]">{{ statusText(book) }}</span>
              <button class="import-item-remove" title="移除" @click="removeImportBook(index)">
                <Icon name="close" :size="14" />
              </button>
            </div>
            <div class="import-item-fields">
              <input v-model="book.bookname" class="rc-input" placeholder="书名" />
              <input v-model="book.author" class="rc-input" placeholder="作者" />
            </div>
          </li>
        </ul>
      </div>

      <template #footer>
        <RcButton class="import-add-rule" :disabled="isLoading" icon="plus" @click="ruleDialogVisible = true">新增解析规则</RcButton>
        <RcButton :disabled="isLoading" @click="closeDialog">取消</RcButton>
        <RcButton type="primary" :disabled="isLoading || importBooks.length === 0" @click="importAll">
          {{ isLoading ? '处理中…' : '导入' }}
        </RcButton>
      </template>
    </Dialog>

    <!-- 新增解析规则 -->
    <ParseRuleDialog v-model="ruleDialogVisible" @saved="onRuleSaved" />

    <!-- 删除确认 -->
    <Dialog :model-value="!!deleteTarget" title="移出书架" width="360px" confirm-text="移出" @update:model-value="deleteTarget = null" @confirm="confirmDelete">
      确定要移出《{{ deleteTarget?.bookname }}》吗？该书籍的正文与书签也会被一并删除。
    </Dialog>
  </div>
</template>

<style scoped lang="scss">
.bookshelf-view {
  min-height: 100%;
  padding-bottom: 40px;
}

/* 分组标签栏 */
.group-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 0 28px 14px;
}

.group-tab-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.group-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 220px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--rc-border);
  border-radius: 15px;
  background-color: var(--rc-panel);
  color: var(--rc-text-secondary);
  font-size: 13px;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--rc-primary);
    color: var(--rc-primary);
  }
  &.active {
    border-color: var(--rc-primary);
    background-color: rgba(30, 120, 235, 0.08);
    color: var(--rc-primary);
  }
  /* 正被拖拽的书籍悬停在该分组标签上 */
  &.drag-over {
    border-style: dashed;
    background-color: rgba(30, 120, 235, 0.16);
    color: var(--rc-primary);
  }
}

.group-tab-count {
  padding: 0 5px;
  border-radius: 8px;
  background-color: var(--rc-panel-2);
  font-size: 11.5px;
  line-height: 16px;
  color: var(--rc-text-secondary);

  .group-tab.active & {
    background-color: rgba(30, 120, 235, 0.16);
    color: var(--rc-primary);
  }
}

.group-tab-tools {
  display: none;
  align-items: center;
  gap: 2px;
  margin-left: 2px;

  .group-tab-wrap:hover & {
    display: inline-flex;
  }
}

.group-tool {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  color: var(--rc-text-secondary);
  transition: all 0.2s ease;

  &:hover {
    background-color: var(--rc-hover);
    color: var(--rc-primary);
  }
  &.danger:hover {
    color: var(--rc-danger);
  }
}

.group-add {
  margin-left: 2px;
}

.group-name-input {
  width: 100%;
}

.group-name-tip {
  margin-top: 10px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--rc-text-secondary);
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
  gap: 18px;
  padding: 6px 28px;
}

.book-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-3px);

    .book-cover {
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.18);
    }
    .book-actions {
      opacity: 1;
    }
  }

  /* 拖拽中的源卡片 */
  &.is-dragging {
    opacity: 0.4;
  }

  /* 拖到卡片中央：合并为分组 */
  &.drop-merge .book-cover {
    outline: 2px solid var(--rc-primary);
    outline-offset: -2px;
  }
}

.book-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-radius: 8px;
  background-color: var(--rc-panel-2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transition: box-shadow 0.2s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

/* 合并为分组提示 */
.merge-hint {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background-color: rgba(30, 120, 235, 0.72);
  color: #fff;
  font-size: 12.5px;
  pointer-events: none;
}

/* 插入排序指示线：位于卡片外侧，避免被封面 overflow 裁剪并提升可见度 */
.drop-line {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 2;
  width: 3px;
  border-radius: 2px;
  background-color: var(--rc-primary);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.7), 0 0 10px 2px rgba(30, 120, 235, 0.75);
  pointer-events: none;

  /* 顶部圆点，进一步强化落点位置 */
  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: var(--rc-primary);
    box-shadow: 0 0 6px 1px rgba(30, 120, 235, 0.85);
  }

  &.before {
    left: -9px;
  }
  &.after {
    right: -9px;
  }
}

.book-info {
  padding: 8px 2px 0;
}

.book-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}
.book-author {
  margin-top: 2px;
  font-size: 12px;
  color: var(--rc-text-secondary);
}

.book-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 11.5px;
  color: var(--rc-text-secondary);
}

.meta-tag {
  flex-shrink: 0;
  padding: 0 4px;
  border-radius: 3px;
  font-size: 10.5px;
  font-style: normal;
  line-height: 15px;

  &.last {
    color: var(--rc-primary);
    background-color: rgba(30, 120, 235, 0.12);
  }
  &.latest {
    color: var(--rc-success);
    background-color: rgba(103, 194, 58, 0.14);
  }
}

.book-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.book-progress-bar {
  position: relative;
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background-color: var(--rc-panel-2);
  overflow: hidden;

  i {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    border-radius: 2px;
    background-color: var(--rc-primary);
    transition: width 0.3s ease;
  }
}

.book-progress-text {
  flex-shrink: 0;
  width: 32px;
  font-size: 11px;
  color: var(--rc-text-secondary);
  text-align: right;
}

.book-stat {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  font-size: 11px;
  color: var(--rc-text-secondary);
}

.book-stat-dot {
  opacity: 0.6;
}

.book-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.book-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--rc-border);
  border-radius: 6px;
  background-color: var(--rc-panel);
  color: var(--rc-text-secondary);
  transition: all 0.2s ease;

  &:hover {
    color: var(--rc-primary);
    border-color: var(--rc-primary);
  }
  &.danger:hover {
    color: #fff;
    background-color: var(--rc-danger);
    border-color: var(--rc-danger);
  }
}

.pagination-wrap {
  padding: 24px 28px 0;
}

.drag-mask {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  border: 3px dashed var(--rc-primary);
  background-color: rgba(30, 120, 235, 0.08);
  color: var(--rc-primary);
  font-size: 15px;
  pointer-events: none;
}

.import-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.import-rules {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--rc-border);
}

/* 底部“新增解析规则”按钮靠左，其余按钮靠右 */
.import-add-rule {
  margin-right: auto;
}

.import-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 46vh;
  overflow-y: auto;
  padding-right: 4px;
}

.import-item {
  padding: 10px 12px;
  border: 1px solid var(--rc-border);
  border-radius: 8px;
  background-color: var(--rc-panel-2);
}

.import-item-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.import-item-file {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--rc-text-secondary);
}

.import-item-status {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--rc-text-secondary);

  &.fulfilled {
    color: var(--rc-success);
  }
  &.rejected {
    color: var(--rc-danger);
  }
}

.import-item-remove {
  display: flex;
  align-items: center;
  color: var(--rc-text-secondary);
  transition: color 0.2s ease;

  &:hover {
    color: var(--rc-danger);
  }
}

.import-item-fields {
  display: flex;
  gap: 10px;
  margin-top: 9px;

  .rc-input {
    flex: 1;
    min-width: 0;
  }
}
</style>

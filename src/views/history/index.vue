<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { PagePath } from '../../core/window';
import { useBookshelfStore, type Book } from '../../store/bookshelf';
import { useDefaultPagination } from '../../hooks/default-pagination';
import { useMessage } from '../../hooks/message';
import { formatAgo } from '../../core/utils';
import { DEFAULT_COVER } from '../../assets/cover';
import Icon from '../../components/icon/index.vue';
import RcButton from '../../components/button/index.vue';
import SearchInput from '../../components/search-input/index.vue';
import Pagination from '../../components/pagination/index.vue';

const router = useRouter();
const message = useMessage();
const bookshelf = useBookshelfStore();
const keyword = ref('');

/** 有过阅读记录的书籍，按最近阅读时间倒序 */
const source = computed(() => bookshelf.books.filter(b => b.lastReadTime > 0));

const { currentPage, total, totalPage, pages } = useDefaultPagination<Book>({
  source,
  pageSize: 20,
  keyword,
  filter: (book, kw) => book.searchIndex.toLowerCase().includes(kw)
});

const continueRead = (book: Book) => {
  if (book.readIndex < 0) {
    router.push({ path: PagePath.DETAIL, query: { pid: book.pid, detailUrl: book.detailPageUrl } });
    return;
  }
  router.push({
    path: PagePath.READ,
    query: { pid: book.pid, detailUrl: book.detailPageUrl, index: String(book.readIndex) }
  });
};

/** 阅读进度百分比，按已读章节数占章节总数的比例计算 */
const progressOf = (book: Book) => {
  if (!book.chapterCount || book.readIndex < 0) return 0;
  return Math.min(100, Math.round(((book.readIndex + 1) / book.chapterCount) * 100));
};

const formatWords = (count: number) => {
  if (!count) return '字数未知';
  return count >= 10000 ? `${(count / 10000).toFixed(1)} 万字` : `${count} 字`;
};

/** 清除单本书的阅读记录 */
const clearOne = async (book: Book) => {
  const entity = await bookshelf.getBookshelfEntity(book.pid, book.detailPageUrl);
  if (!entity) return;
  await bookshelf.put({ ...entity, readIndex: -1, readScrollTop: 0, lastReadTime: 0 });
  message.success('已清除阅读记录');
};

const clearAll = async () => {
  const list = source.value;
  if (list.length < 1) return;
  for (const book of list) {
    const entity = await bookshelf.getBookshelfEntity(book.pid, book.detailPageUrl);
    if (entity) await bookshelf.put({ ...entity, readIndex: -1, readScrollTop: 0, lastReadTime: 0 });
  }
  message.success('已清空阅读记录');
};
</script>

<template>
  <div class="history-view">
    <div class="rc-page-header">
      <div>
        <span class="rc-page-title">最近阅读</span>
        <span class="rc-page-subtitle">共 {{ total }} 条记录</span>
      </div>
      <div class="rc-page-header-actions">
        <SearchInput v-model="keyword" placeholder="搜索书名 / 作者" width="240px" />
        <RcButton icon="trash" :disabled="total === 0" @click="clearAll">清空记录</RcButton>
      </div>
    </div>

    <ul v-if="pages.length > 0" class="history-list">
      <li v-for="book in pages" :key="book.id" class="history-item" @click="continueRead(book)">
        <div class="history-cover">
          <img :src="book.coverImageUrl || DEFAULT_COVER" :alt="book.bookname" />
        </div>
        <div class="history-info">
          <p class="history-name rc-ellipsis">{{ book.bookname }}</p>
          <p class="history-author rc-ellipsis">{{ book.author || '未知作者' }}</p>
          <p class="history-chapter rc-ellipsis">
            <Icon name="bookmark" :size="13" />
            <span>{{ book.readChapterTitle || '尚未阅读' }}</span>
          </p>
          <div class="history-meta">
            <div class="history-progress" :title="`已读 ${progressOf(book)}%`">
              <span class="history-progress-bar"><i :style="{ width: `${progressOf(book)}%` }" /></span>
              <span class="history-progress-text">{{ progressOf(book) }}%</span>
            </div>
            <span class="history-stat"> {{ formatWords(book.wordCount) }}</span>
          </div>
        </div>
        <div class="history-right">
          <span class="history-time">{{ formatAgo(book.lastReadTime) }}</span>
          <div class="history-actions">
            <RcButton size="small" icon="book-open" @click.stop="continueRead(book)">继续阅读</RcButton>
            <RcButton size="small" type="text" icon="trash" @click.stop="clearOne(book)">清除</RcButton>
          </div>
        </div>
      </li>
    </ul>

    <div v-else class="rc-empty">
      <Icon name="history" :size="46" />
      <p>{{ keyword ? '没有匹配的记录' : '还没有阅读记录' }}</p>
      <p class="rc-empty-tip">在书架中打开一本书开始阅读后，这里会记录你的阅读进度</p>
    </div>

    <div class="pagination-wrap">
      <Pagination v-model="currentPage" :total-page="totalPage" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.history-view {
  min-height: 100%;
  padding-bottom: 40px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 28px 0;
  list-style: none;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid var(--rc-border);
  border-radius: 10px;
  background-color: var(--rc-panel);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--rc-primary);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  }
}

.history-cover {
  flex-shrink: 0;
  width: 52px;
  height: 70px;
  overflow: hidden;
  border-radius: 6px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-name {
  font-size: 14.5px;
  font-weight: 600;
}
.history-author {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--rc-text-secondary);
}
.history-chapter {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--rc-text-secondary);
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 7px;
  font-size: 12px;
  color: var(--rc-text-secondary);
}

.history-progress {
  display: flex;
  align-items: center;
  gap: 6px;
}

.history-progress-bar {
  position: relative;
  width: 120px;
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

.history-progress-text {
  font-size: 11.5px;
  color: var(--rc-text-secondary);
}

.history-stat {
  flex-shrink: 0;
  font-size: 11.5px;
}

.history-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.history-time {
  font-size: 12px;
  color: var(--rc-text-secondary);
}

.history-actions {
  display: flex;
  gap: 8px;
}

.pagination-wrap {
  padding: 24px 28px 0;
}
</style>

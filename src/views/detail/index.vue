<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { PagePath } from '../../core/window';
import { useDetailStore } from '../../store/detail';
import { useBookshelfStore } from '../../store/bookshelf';
import { useBookmarkStore } from '../../store/bookmark';
import { useDefaultPagination } from '../../hooks/default-pagination';
import { useMessage } from '../../hooks/message';
import { DEFAULT_COVER } from '../../assets/cover';
import Icon from '../../components/icon/index.vue';
import RcButton from '../../components/button/index.vue';
import SearchInput from '../../components/search-input/index.vue';
import Pagination from '../../components/pagination/index.vue';
import Dialog from '../../components/dialog/index.vue';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const detail = useDetailStore();
const bookshelf = useBookshelfStore();
const { removeBookmarksByDetailUrl } = useBookmarkStore();

const pid = String(route.query.pid || '');
const detailUrl = String(route.query.detailUrl || '');

const { detailResult, error, currentReadIndex } = storeToRefs(detail);
const isLoading = ref(true);
const keyword = ref('');

const chapterList = computed(() => detailResult.value?.chapterList || []);

const { currentPage, total, totalPage, pages } = useDefaultPagination({
  source: chapterList,
  pageSize: 60,
  keyword,
  filter: (chapter, kw) => chapter.title.toLowerCase().includes(kw)
});

const load = async () => {
  isLoading.value = true;
  try {
    await detail.setBook(pid, detailUrl);
    if (detail.error) message.error(detail.error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(load);

const readIndex = computed(() => currentReadIndex.value);

const startRead = (index?: number) => {
  const list = chapterList.value;
  if (list.length < 1) {
    message.warning('本书没有可用章节');
    return;
  }
  const target = index ?? (readIndex.value >= 0 ? readIndex.value : 0);
  router.push({
    path: PagePath.READ,
    query: { pid, detailUrl, index: String(target) }
  });
};

const delVisible = ref(false);
const confirmDelete = async () => {
  delVisible.value = false;
  await Promise.all([
    GLOBAL_DB.store.textContentStore.removeByPidAndDetailUrl(pid, detailUrl),
    removeBookmarksByDetailUrl(detailUrl)
  ]);
  const entity = await bookshelf.getBookshelfEntity(pid, detailUrl);
  if (!entity) return;
  await bookshelf.removeByPidAndDetailUrl(pid, detailUrl);
  message.success('已移出书架');
  router.push(PagePath.BOOKSHELF);
};
</script>

<template>
  <div class="detail-view">
    <div class="detail-toolbar">
      <button class="detail-back" @click="router.push(PagePath.BOOKSHELF)">
        <Icon name="back" :size="16" />
        <span>返回书架</span>
      </button>
    </div>

    <div v-if="detailResult" class="detail-header">
      <div class="detail-cover">
        <img :src="detailResult.coverImageUrl || DEFAULT_COVER" :alt="detailResult.bookname" />
      </div>
      <div class="detail-meta">
        <h2 class="detail-name">{{ detailResult.bookname }}</h2>
        <p class="detail-author">
          <Icon name="type" :size="14" />
          <span>{{ detailResult.author || '未知作者' }}</span>
        </p>
        <p class="detail-chapters-count">共 {{ chapterList.length }} 章</p>
        <p class="detail-progress">
          {{ readIndex >= 0 ? `已读到：${chapterList[readIndex]?.title || '未知章节'}` : '尚未开始阅读' }}
        </p>
        <div class="detail-actions">
          <RcButton type="primary" icon="book-open" @click="startRead()">
            {{ readIndex >= 0 ? '继续阅读' : '开始阅读' }}
          </RcButton>
          <RcButton icon="trash" @click="delVisible = true">移出书架</RcButton>
        </div>
      </div>
    </div>

    <div v-else-if="!isLoading" class="rc-empty">
      <Icon name="warning" :size="44" />
      <p>{{ error || '无法获取书籍详情' }}</p>
      <RcButton @click="load">重新加载</RcButton>
    </div>

    <div class="detail-chapters">
      <div class="rc-page-header">
        <span class="rc-page-title" style="font-size: 15px">章节目录</span>
        <SearchInput v-model="keyword" placeholder="搜索章节" width="220px" />
      </div>
      <ul v-if="pages.length > 0" class="chapter-list">
        <li v-for="chapter in pages" :key="chapter.index" :class="['chapter-item', chapter.index === readIndex ? 'active' : '']" @click="startRead(chapter.index)">
          <span class="chapter-title rc-ellipsis">{{ chapter.title }}</span>
          <span v-if="chapter.index === readIndex" class="chapter-badge">上次读到</span>
        </li>
      </ul>
      <div v-else class="rc-empty" style="padding: 50px 20px">
        <p>{{ total > 0 ? '没有匹配的章节' : '本书没有章节' }}</p>
      </div>
      <div class="pagination-wrap">
        <Pagination v-model="currentPage" :total-page="totalPage" />
      </div>
    </div>

    <Dialog v-model="delVisible" title="移出书架" width="360px" confirm-text="移出" @confirm="confirmDelete">
      确定要移出《{{ detailResult?.bookname }}》吗？该书籍的正文与书签也会被一并删除。
    </Dialog>

    <div v-if="isLoading" class="detail-loading">
      <div class="rc-spinner"><span></span><span></span></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.detail-view {
  position: relative;
  min-height: 100%;
  padding-bottom: 40px;
}

.detail-toolbar {
  padding: 16px 28px 0;
}

.detail-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px 0 9px;
  border: 1px solid var(--rc-border);
  border-radius: 6px;
  background-color: var(--rc-panel);
  color: var(--rc-text-secondary);
  transition: all 0.2s ease;

  &:hover {
    color: var(--rc-primary);
    border-color: var(--rc-primary);
  }
}

.detail-header {
  display: flex;
  gap: 26px;
  padding: 22px 28px 26px;
  border-bottom: 1px solid var(--rc-border);
}

.detail-cover {
  flex-shrink: 0;
  width: 148px;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.detail-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-top: 4px;
}

.detail-name {
  font-size: 21px;
  font-weight: 600;
  line-height: 1.4;
}

.detail-author {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  color: var(--rc-text-secondary);
}

.detail-chapters-count,
.detail-progress {
  margin-top: 8px;
  font-size: 13px;
  color: var(--rc-text-secondary);
}

.detail-actions {
  display: flex;
  gap: 10px;
  margin-top: auto;
  padding-top: 18px;
}

.chapter-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  padding: 4px 28px 0;
  list-style: none;
}

.chapter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border: 1px solid var(--rc-border);
  border-radius: 6px;
  background-color: var(--rc-panel);
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    border-color: var(--rc-primary);
    color: var(--rc-primary);
  }
  &.active {
    background-color: rgba(30, 120, 235, 0.1);
    color: var(--rc-primary);
  }

  .chapter-title {
    flex: 1;
    min-width: 0;
    font-size: 13.5px;
  }

  .chapter-badge {
    flex-shrink: 0;
    padding: 1px 6px;
    border-radius: 4px;
    background-color: var(--rc-primary);
    color: #fff;
    font-size: 11px;
  }
}

.pagination-wrap {
  padding: 22px 28px 0;
}

.detail-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--rc-bg);
}

.rc-spinner {
  position: relative;
  width: 48px;
  height: 48px;
  color: var(--rc-primary);

  span {
    position: absolute;
    inset: 0;
    border: 3px solid currentColor;
    border-radius: 50%;
    animation: detail-ripple 1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
  }
  span:nth-child(2) {
    animation-delay: -0.5s;
  }
}

@keyframes detail-ripple {
  0% {
    transform: scale(0.12);
    opacity: 0;
  }
  5% {
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}
</style>

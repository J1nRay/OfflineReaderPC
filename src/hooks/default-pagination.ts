import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';

export type PaginationOptions<T> = {
  /** 数据源 */
  source: ComputedRef<T[]> | Ref<T[]>;
  /** 每页数量 */
  pageSize?: number;
  /** 搜索关键词 */
  keyword?: Ref<string>;
  /** 关键词过滤函数（默认根据 searchIndex 匹配） */
  filter?: (item: T, keyword: string) => boolean;
};

/** 轻量分页（含关键词过滤） */
export const useDefaultPagination = <T>(options: PaginationOptions<T>) => {
  const pageSize = options.pageSize ?? 24;
  const currentPage = ref(1);

  const list = computed<T[]>(() => {
    const source = options.source.value || [];
    const keyword = options.keyword?.value.trim().toLowerCase() || '';
    if (!keyword) return source;
    const filter = options.filter;
    if (!filter) return source;
    return source.filter(item => filter(item, keyword));
  });

  const total = computed(() => list.value.length);
  const totalPage = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
  const pages = computed<T[]>(() =>
    list.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize)
  );

  watch(totalPage, max => {
    if (currentPage.value > max) currentPage.value = max;
  });

  const reset = () => (currentPage.value = 1);

  return { currentPage, total, totalPage, pages, pageSize, reset };
};

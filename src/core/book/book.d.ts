export type Chapter = {
  title: string;
  url: string;
  index: number;
};

export type DetailEntity = {
  bookname: string;
  author: string;
  coverImageUrl: string;
  latestChapterTitle?: string;
  intro?: string;
  chapterList: Chapter[];
};

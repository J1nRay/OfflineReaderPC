export enum PagePath {
  BOOKSHELF = '/bookshelf',
  DETAIL = '/detail',
  READ = '/read',
  HISTORY = '/history'
}
export namespace PagePath {
  const map = new Map<string, PagePath>();
  Object.keys(PagePath).forEach(v => {
    const e = (<any>PagePath)[v];
    map.set(e.toString(), e);
  });
  export const valueOf = (val: string) => map.get(val);
}

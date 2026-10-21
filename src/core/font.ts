export type FontData = {
  id: string;
  fullName: string;
  family: string;
};

/** 可选字体（依赖系统已安装字体，保持轻量，不内嵌字体文件） */
export class Font {
  static readonly default: FontData = { id: 'font-system', fullName: '系统默认', family: '' };
  static readonly all: FontData[] = [
    Font.default,
    { id: 'font-yahei', fullName: '微软雅黑', family: '"Microsoft YaHei", "微软雅黑"' },
    { id: 'font-simsun', fullName: '宋体', family: 'SimSun, 宋体, serif' },
    { id: 'font-simhei', fullName: '黑体', family: 'SimHei, 黑体, sans-serif' },
    { id: 'font-kaiti', fullName: '楷体', family: 'KaiTi, 楷体, serif' },
    { id: 'font-fangsong', fullName: '仿宋', family: 'FangSong, 仿宋, serif' }
  ];
  static get(id: string) {
    return Font.all.find(f => f.id === id);
  }
}

/** 文件选择相关类型（Electron 主进程与渲染进程共用） */
interface FileType {
  description: string;
  accept: Record<string, string[]>;
}

interface OpenFilePickerOptions {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: FileType[];
}

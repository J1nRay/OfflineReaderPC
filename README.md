# OfflineReader

一款基于 **Electron + Vue 3** 的 Windows 桌面离线阅读器，仅面向本地 TXT 文件：无书城、无联网、无广告，导入后即可离线阅读。

> 当前版本：`1.0.0` ｜ 作者：DeepSeek-V4.1-Flash & JinRay ｜ 许可证：MIT

## 功能特性

### 书籍导入与解析

- 本地 TXT 导入：文件选择或直接拖拽文件到书架
- 自动检测文件编码（`jschardet`），使用 `iconv-lite` 解码，兼容常见中文编码
- 内置书名、作者、简介、章节标题解析规则，支持在设置页新增 / 编辑 / 删除自定义规则
- 未匹配到章节标题时，按「单章最大行数」自动切分章节
- TXT 读取与章节解析均在 Web Worker 中执行，避免阻塞界面

### 书架

- 卡片展示书名、作者、章节数、正文字数、阅读进度、上次阅读章节与最终章节
- 支持书名 / 作者搜索
- 支持创建分组（文件夹），拖拽书籍到另一本书中央即可合并创建分组；分组可重命名、删除
- 拖拽书籍到卡片左右边缘可调整排序，外部文件拖拽仍用于导入，两种手势按区域区分
- 书籍移出书架时同步删除章节正文与书签

### 阅读

- 连续章节渲染，滚动到底自动加载下一章，并对已读章节做裁剪以控制 DOM 体积
- 底部悬浮工具栏：上一章 / 下一章、章节目录（点击章节名弹出，支持搜索与输入序号跳转）、自动阅读、日间 / 夜间、护眼模式、书签、阅读设置
- 书签支持跨段落选择，同一章可保存多条书签片段，可填写备注；书签面板可查看原文、备注与时间并定位
- 自动阅读支持速度调节（px/s）
- 阅读设置：字体、字号、字间距、行间距、段落间距、正文宽度、字体粗细、背景配色
- 亮度支持「跟随系统」或手动调节，并提供护眼模式遮罩
- 阅读进度条支持「整本进度」与「按当前章节计算」两种口径
- 快捷键：`←` / `→` 上一章 / 下一章，`↑` / `↓` 滚动，`Space` 下一页，`Esc` 关闭面板

### 最近阅读

- 汇总有阅读记录的书籍，展示阅读进度、总字数、上次阅读章节等信息

### 设置与数据

- 主题：跟随系统 / 浅色 / 深色；界面缩放
- 阅读与滚动行为开关、章节解析规则管理
- 显示应用数据存储路径，一键打开目录，统计书籍 / 正文 / 书签 / 分组占用
- 清空缓存：删除已导入书籍、章节正文、书签与分组，保留设置和解析规则

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 桌面运行时 | Electron 31 |
| 前端框架 | Vue 3.5（`<script setup>` + TypeScript） |
| 状态管理 | Pinia 2 |
| 路由 | Vue Router 4（Hash 模式） |
| 构建 | Vite 5 + `vite-plugin-electron` |
| 样式 | SCSS + CSS 变量主题（无 UI 组件库） |
| 本地存储 | IndexedDB（原生封装，无 ORM） |
| 文本处理 | Web Worker + `iconv-lite` + `jschardet` |
| 打包 | electron-builder（NSIS） |

## 目录结构

```text
OfflineReaderPC/
├─ electron/                        # Electron 主进程
│  ├─ main.ts                       # 创建窗口、窗口控制、文件选择、数据目录等 IPC
│  ├─ preload.ts                    # 启动加载动画与 DOM 辅助
│  └─ electron-env.d.ts
├─ events/
│  └─ index.ts                      # 主进程 / 渲染进程共享的 IPC 事件常量
├─ public/
│  └─ icons/icon.ico                # 应用图标
├─ src/                             # 渲染进程
│  ├─ main.ts                       # 入口：初始化 IPC、Pinia、路由与 Core
│  ├─ App.vue                       # 根布局：标题栏、路由视图、消息、回到顶部、滚动记录
│  ├─ assets/                       # 默认封面等内置资源
│  ├─ components/                   # 通用组件
│  │  ├─ title-bar/                 # 自定义标题栏与导航
│  │  ├─ dialog/ · message/         # 对话框与全局消息
│  │  ├─ button/ · icon/ · select/  # 基础控件
│  │  ├─ number-stepper/            # 数字步进输入框
│  │  ├─ search-input/ · pagination/# 搜索与分页
│  │  ├─ menu/ · backtop/ · loading/# 右键菜单、回到顶部、加载动画
│  │  └─ parse-rule-dialog/         # TXT 解析规则编辑弹窗
│  ├─ core/
│  │  ├─ index.ts                   # Core：IPC / 日志 / 数据库初始化
│  │  ├─ ipc-renderer.ts            # ipcRenderer 封装
│  │  ├─ logger.ts · utils.ts · is.ts
│  │  ├─ font.ts                    # 内置字体列表
│  │  ├─ window/                    # 路由枚举、默认阅读样式
│  │  ├─ book/
│  │  │  ├─ book-parser.ts          # 书籍解析抽象基类、入库实体转换
│  │  │  └─ txt-parser/             # TXT 解析规则、章节切分与 Worker
│  │  └─ database/
│  │     ├─ index.ts                # IndexedDB 打开 / 建表 / 数据统计与清空
│  │     ├─ database.d.ts           # 各数据表实体类型
│  │     └─ store/                  # 单表封装（书架、分组、正文、书签、设置、规则）
│  ├─ hooks/                        # 消息提示、快捷键、分页等组合式函数
│  ├─ router/index.ts               # 路由表
│  ├─ store/                        # Pinia
│  │  ├─ bookshelf.ts · book-group.ts
│  │  ├─ bookmark.ts · detail.ts · text-content.ts
│  │  ├─ settings.ts · txt-parse-rules.ts
│  │  ├─ window.ts · scrolltop.ts · search.ts
│  │  └─ defined/settings.d.ts      # 设置数据结构
│  ├─ styles/index.scss             # 全局样式与主题变量
│  ├─ types/file.d.ts               # 文件相关类型
│  ├─ views/
│  │  ├─ bookshelf/                 # 书架页（导入、分组、排序）
│  │  ├─ detail/                    # 书籍详情页（简介、章节目录）
│  │  ├─ read/                      # 阅读页
│  │  │  ├─ components/             # 阅读设置、书签面板、章节目录
│  │  │  └─ hooks/                  # 书签、滚动逻辑
│  │  ├─ history/                   # 最近阅读页
│  │  └─ settings/                  # 设置页
│  ├─ worker/
│  │  ├─ index.ts                   # Worker 调用封装
│  │  └─ txt-file.ts                # 文件读取与编码检测
│  ├─ global.d.ts                   # 全局变量声明
│  └─ vite-env.d.ts
├─ index.html
├─ vite.config.ts                   # Vite + Electron 构建配置
├─ tsconfig.json / tsconfig.node.json
├─ builder.cjs                      # Windows 安装包打包脚本
└─ package.json
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9
- Windows（打包配置目前仅提供 Windows NSIS 目标）

### 安装与开发

```bash
npm install
npm run dev
```

`npm run dev` 会启动 Vite 开发服务器并由 `vite-plugin-electron` 自动拉起 Electron 窗口，支持热更新。

### 构建与打包

```bash
# 类型检查 + 构建渲染进程与主进程（输出 dist / dist-electron）
npm run build

# 生成 Windows x64 安装包（输出 release）
npm run build:win

# 生成 Windows ia32 安装包
npm run build:win:ia32
```

### 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发环境（Vite + Electron） |
| `npm run build:render` | `vue-tsc --noEmit` 类型检查 + `vite build` |
| `npm run build` | 同上 |
| `npm run build:win` | 构建并打包 Windows x64 安装包 |
| `npm run build:win:ia32` | 构建并打包 Windows ia32 安装包 |
| `npm run preview` | 预览构建后的前端产物 |

## 数据存储

应用数据全部保存在本地，不涉及任何网络请求。

- 存储位置：Electron `userData` 目录，Windows 默认为 `%APPDATA%\offline-reader-pc`
- 可在「设置 → 数据与存储」中查看路径、打开目录、查看占用并清空缓存
- 数据库名：`OfflineReaderDatabase`（IndexedDB）

| 数据表 | 内容 |
| --- | --- |
| `store_bookshelf` | 书籍信息、章节列表、阅读进度、分组与排序 |
| `store_book_group` | 用户创建的分组 |
| `store_text_content` | 每章正文文本（按书 + 章节存储） |
| `store_bookmark` | 书签（一章一条，包含多个选区 `range` 与备注） |
| `store_settings` | 界面与阅读设置（变更后防抖 3 秒持久化） |
| `store_txt_parse_rule` | 自定义 TXT 章节解析规则 |

> 说明：清空缓存只会删除前四张业务表的数据，设置与解析规则会保留。

## 实现要点

- **导入链路**：`worker/txt-file.ts` 读取文件并检测编码 → `core/book/txt-parser` 按规则解析书名 / 作者 / 简介 / 章节 → `BookParser.toDatabaseEntity()` 生成书架实体与分章正文 → 写入 IndexedDB 并更新 Pinia。
- **阅读链路**：`views/read` 将多个 `.chapter-block` 连续追加到 `#text-content`，根据滚动位置同步当前章节、更新进度与书架记录，并按需裁剪远离当前章节的 DOM。
- **自动阅读**：使用 `requestAnimationFrame` 驱动，通过独立的小数像素累积器再取整后写入 `scrollTop`（Chromium 会丢弃小数像素，直接逐帧累加会导致不滚动）。
- **设置持久化**：`SettingsStoreDatabase.watch()` 监听 Pinia 设置变化，防抖后写入 `store_settings`；读取时通过 `$patch` 合并，保证新增字段有默认值。
- **IPC**：事件常量统一放在 `events/index.ts`；主进程处理器在 `electron/main.ts` 注册，渲染进程通过全局 `GLOBAL_IPC` 调用。
- **轻量原则**：未引入任何 UI 组件库或网络模块，组件与样式均为项目内自研。

## 二次开发指引

### 新增页面

1. 在 `src/views/` 下创建页面组件；
2. 在 `src/router/index.ts` 注册路由；
3. 如需参与标题栏高亮或滚动位置记录，在 `src/core/window/index.ts` 的 `PagePath` 中补充枚举（`currentPath` 同时兼容 `/settings` 这类非枚举路径）。

### 新增设置项

1. 在 `src/store/defined/settings.d.ts` 中补充类型；
2. 在 `src/store/settings.ts` 的默认值中补充字段（缺省值会通过 `$patch` 兼容旧数据）；
3. 在设置页或阅读设置面板中绑定表单控件，保存会自动持久化。

### 新增数据表

1. 在 `src/core/database/index.ts` 的 `StoreName` 中增加表名，并提升 `Database.VERSION`；
2. 在 `createDatabase()` 中创建表与索引；
3. 参照 `src/core/database/store/base-store.ts` 新增单表封装，并挂到 `StoreMap`。

### 新增 IPC

1. 在 `events/index.ts` 中新增事件常量；
2. 在 `electron/main.ts` 中注册 `ipcMain` 处理器；
3. 渲染进程通过 `GLOBAL_IPC.send / sendSync` 调用，需要回传结果时使用 `event.sender.send`。

## 常见问题

**导入后章节识别不正确？**

在「设置 → TXT 解析」中调整章节标题规则或「单章最大行数」。规则支持正则与 `i / m / g` 标志，可先新增规则并观察示例是否匹配。

**应用数据在哪里？**

见「数据存储」章节，或在应用内「设置 → 数据与存储 → 打开目录」直接定位。

**清空缓存会删除设置吗？**

不会。清空仅删除书籍、章节正文、书签和分组，主题、阅读设置与解析规则保留。

**开发环境窗口没有出现？**

确认 Node.js 版本满足要求，并检查终端中 Vite 与 Electron 是否有报错；主进程日志位于 `userData/logs`。

## 许可证

本项目基于 [MIT License](https://opensource.org/licenses/MIT) 开源，可自由使用、修改与分发。

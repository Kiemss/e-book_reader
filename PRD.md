# 📚 基础款电子书阅读器 (React+Windows) PRD & 架构文档

## 1. 产品概述 (Product Requirements Document)

### 1.1 产品愿景
开发一款轻量、极致纯粹的 Windows 本地电子书阅读器。去除了繁杂的云同步和社交功能，对标 anx-reader 的核心阅读体验，专注提供流畅的本地书籍管理与阅读服务。

### 1.2 核心功能边界 (MVP阶段 - P0/P1优先级)

**1. 书架管理模块 (Bookshelf)**
*   **本地导入**：支持通过文件选择器或拖拽方式导入 `.epub` 格式文件（第一期暂不包含TXT/PDF）。
*   **元数据提取**：自动解析 EPUB 提取书名、作者、封面图。
*   **书籍展示**：网格视图展示书籍封面、书名、阅读进度百分比。
*   **最近阅读**：首页顶部展示最后一次阅读的书籍，一键继续阅读。

**2. 阅读核心引擎 (Reader Engine)**
*   **排版渲染**：完美渲染 EPUB 的 HTML 内容（基于 `epub.js`）。
*   **目录导航**：侧边栏展示多级树状目录 (TOC)，点击跳转。
*   **翻页模式**：支持鼠标滚轮上下滚动、键盘左右方向键平滑翻页。

**3. 个性化设置 & 状态记忆 (Settings & State)**
*   **基础样式定制**：字号放大/缩小、字体选择、背景颜色（浅色/护眼/夜间模式）、行距调节。
*   **进度记忆**：自动实时保存当前阅读的 CFILocation（EPUB定位符），下次打开无缝衔接。

### 1.3 技术栈选型建议
*   **核心框架**：Electron 
*   **前端框架**：React 18 + TypeScript + Vite
*   **UI 组件库**：Tailwind CSS + shadcn/ui (界面现代且干净)
*   **状态管理**：Zustand (轻量，适合保存设置和阅读状态)
*   **数据存储**：`localforage` 或 Electron 的 `electron-store` (存储库图书列表与阅读进度)
*   **EPUB解析**：`epub.js` (业界标杆，AI 生成其对接代码准确率极高)

---

## 2. AI 代码生成提示词模板库 (Prompt Templates)

在使用 AI (如 Gemini 3.1 Pro 或 Claude 3.5 Sonnet) 进行开发时，**不要一次性让 AI 写完整个软件**。请按照以下四个阶段，依次将对应的提示词发给 AI。

### 📁 阶段一：项目初始化与基建 (Prompt 1)

```markdown
# 角色定义
你是一个资深的 Windows 桌面端开发专家，精通 Electron, React, TypeScript 和 Vite。

# 任务目标
请帮我初始化一个轻量级电子书阅读器的基础项目结构。

# 技术限制与要求
1. 使用 Vite 初始化 React + TypeScript 项目，并正确配置 Electron 架构（区分主进程 main 和渲染进程 renderer）。
2. 引入 Tailwind CSS 并完成基础配置。
3. 引入 Zustand 作为状态管理工具。
4. 通信机制：配置好 Electron IPC (Inter-Process Communication)，暴露一个 `window.electronAPI`，实现至少一个基础方法：`openFileDialog` (用于后续选择 epub 文件)。

# 输出要求
请给出完整的命令行初始化步骤（npm/yarn），以及核心的 `vite.config.ts`, `electron/main.ts`, `electron/preload.ts` 的代码实现。不要写业务代码，只搭建骨架。
```

### 📁 阶段二：数据模型与书架 UI (Prompt 2)

```markdown
# 角色与背景
项目基建已完成（Electron + React）。现在需要开发“书架管理”模块。

# 任务目标
1. 定义书籍的数据结构 (Book Model)。
2. 使用 Zustand 创建一个 `useBookStore`，包含：书籍列表、添加书籍、删除书籍的方法。
3. 开发一个现代化的书架 UI 组件 (Bookshelf.tsx)。

# 详细需求
- Book 接口定义应包含：id, title, author, coverImage (base64或路径), lastReadIndex/cfi, addedDate。
- 引入 `epubjs` 库，在用户通过 `window.electronAPI.openFileDialog` 选定文件后，使用 epub.js 在内存里粗扫一遍文件，提取出 title, author 和 cover，然后存入 Zustand 仓库。
- 书架 UI 使用 Tailwind CSS，采用响应式网格 (CSS Grid)，每本书展示封面图、书名、作者。如果没有封面，展示一个包含书名首字母的优美默认占位图。

# 输出要求
请提供 `types.ts`, `store/bookStore.ts` 以及 `components/Bookshelf.tsx` 的完整 TypeScript 代码。
```

### 📁 阶段三：EPUB 阅读器核心渲染层 (Prompt 3)

```markdown
# 角色与背景
书架功能已准备好。当用户在书架点击某本书时，我们需要跳入“阅读模式”。我们需要基于 `epub.js` 开发阅读器核心组件。

# 任务目标
开发 `Reader.tsx` 组件，实现 EPUB 文件的本地渲染。

# 详细需求
1. 接收文件路径 (File object 或 URL)，使用 `epub.js` 初始化一个 `Book` 和 `Rendition` 实例。
2. 将书籍内容挂载到一个 `<div id="viewer"></div>` 容器中。
3. 【翻页控制】：实现“上一页(prev)”和“下一页(next)”按钮，并绑定键盘的左右方向键事件 (`keyup` 监听)。
4. 【进度保存】：监听 epub.js 的 `relocated` 事件，获取当前的 `cfi`，随时保存到 Zustand store 中。
5. 【初始跳转】：组件挂载时，如果该书在 store 中已有保存的 `cfi`，则调用 `rendition.display(savedCfi)` 跳到上次阅读位置；否则跳到封面/第一页。

# 输出要求
给出 `components/Reader.tsx` 的代码。注意处理好 React 的 `useEffect` 生命周期，在组件卸载时正确销毁 epub 实例以防内存泄漏。
```

### 📁 阶段四：侧边栏目录与阅读设置 (Prompt 4)

```markdown
# 角色与背景
电子书已经可以正常渲染和翻页。现在需要加入高阶辅助功能：目录导航与主题设置。

# 任务目标
完善 `Reader.tsx` 页面，增加侧边栏面板和设置面板。

# 详细需求
1. 【获取目录】：通过 `book.loaded.navigation` 获取 EPUB 的 TOC (Table of Contents)，在左侧渲染为一个可点击的树状列表。点击目录项时，调用 `rendition.display(href)` 跳转。
2. 【主题切换】：设计一个简单的设置气泡框。允许用户切换 3 种背景模式（浅色 #FFFFFF、护眼 #FDF6E3、夜间 #1E1E1E）。
3. 【字体控制】：提供两个按钮 [A-] 和 [A+]。
4. 【技术原理】：主题和字体大小的切换，必须通过 `epub.js` 提供的 `rendition.themes.register()` 和 `rendition.themes.fontSize()` API 来作用于 iframe 内部，而不是修改外部 React 容器的 CSS。

# 输出要求
提供如何提取和展平 epub 目录的代码逻辑，以及如何将主题注入到 epsub.js Rendition 实例的最佳实践代码。
```
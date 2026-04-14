# 系统架构设计文档

## 1. 整体架构

### 1.1 三进程模型

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│                      (Node.js 环境)                          │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │  ipcMain.handle │  │       File System (fs)           │  │
│  │  dialog:openFile│  │  fs.promises.readFile()          │  │
│  │  fs:readFile    │  │                                   │  │
│  └────────┬────────┘  └─────────────────────────────────┘  │
│           │                                                    │
│           │ IPC (invoke/handle)                               │
└───────────┼────────────────────────────────────────────────────┘
            │ contextBridge
┌───────────┼────────────────────────────────────────────────────┐
│           ▼           Preload Script (bridge)                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  window.electronAPI = {                                  │   │
│  │    openFileDialog: () => ipcRenderer.invoke(...),        │   │
│  │    readFile: (path) => ipcRenderer.invoke(..., path)     │   │
│  │  }                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Renderer Process (Browser)                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                        App.tsx                           │  │
│  │  ┌─────────────────┐    ┌────────────────────────────┐  │  │
│  │  │   Bookshelf     │    │        Reader              │  │  │
│  │  │   (书架)        │◄──►│        (阅读器)             │  │  │
│  │  └────────┬────────┘    └────────────┬───────────────┘  │  │
│  │           │                          │                   │  │
│  │           ▼                          ▼                   │  │
│  │  ┌──────────────────────────────────────────────┐       │  │
│  │  │           useBookStore (Zustand)              │       │  │
│  │  │  ┌────────┐ ┌────────┐ ┌────────────────┐   │       │  │
│  │  │  │ books  │ │addBook │ │updateProgress  │   │       │  │
│  │  │  │ Book[] │ │        │ │ (CFI 位置)     │   │       │  │
│  │  │  └────────┘ └────────┘ └────────────────┘   │       │  │
│  │  └──────────────────────────────────────────────┘       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                   │
│                            ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    epub.js                                 │  │
│  │  Book Instance ──► Rendition ──► iframe (DOM)            │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 技术选型理由

| 技术 | 选型理由 |
|------|----------|
| Electron | 跨平台桌面框架，Web 技术栈可直接迁移 |
| React 19 | 最新的 Hooks 支持，函数式组件更易维护 |
| TypeScript | 类型安全，AI 生成代码准确率高 |
| Vite | 极速 HMR，开发体验优秀 |
| Zustand | 极简 API，状态持久化易于实现 |
| epub.js | EPUB 渲染行业标准，社区活跃 |
| localforage | IndexedDB 封装，支持大文件存储 |
| Tailwind CSS | 原子化 CSS，快速原型开发 |

---

## 2. 模块职责

### 2.1 Main Process (main.ts)

**职责**：
- 创建 BrowserWindow 实例
- 注册 IPC handlers
- 处理原生对话框和文件读写

**关键代码**：

```typescript
// 窗口创建
new BrowserWindow({
  width: 1024,
  height: 768,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
  },
})

// IPC handlers
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'eBooks', extensions: ['epub'] }]
  })
  return canceled ? null : filePaths[0]
})

ipcMain.handle('fs:readFile', async (_, filePath) => {
  return fs.promises.readFile(filePath)
})
```

### 2.2 Preload Script (preload.ts)

**职责**：
- 通过 contextBridge 安全暴露 API
- 隔离主进程与渲染进程

**关键代码**：

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
})
```

### 2.3 Bookshelf Component

**职责**：
- 展示书籍列表（网格视图）
- 处理书籍导入（调用 Electron API + epub.js 解析）
- 处理书籍删除

**状态依赖**：
- `useBookStore.books` - 书籍列表
- `useBookStore.addBook()` - 添加书籍
- `useBookStore.removeBook()` - 删除书籍

### 2.4 Reader Component

**职责**：
- EPUB 渲染与翻页
- 主题/字体/行距设置
- 书签管理
- 全文搜索
- 进度追踪与保存

**状态依赖**：
- `useBookStore.updateBookProgress()` - 更新阅读位置
- `useBookStore.addBookmark()` - 添加书签
- `useBookStore.removeBookmark()` - 删除书签

### 2.5 BookStore (Zustand)

**职责**：
- 集中管理书籍数据
- 状态持久化到 IndexedDB

**数据结构**：

```typescript
interface BookStoreState {
  books: Book[]                    // 书籍列表
  addBook: (book: Book) => void    // 添加书籍
  removeBook: (id: string) => void // 删除书籍
  updateBookProgress: (id, cfi) => void  // 更新进度
  addBookmark: (bookId, bookmark) => void // 添加书签
  removeBookmark: (bookId, cfi) => void  // 删除书签
}
```

---

## 3. 数据流分析

### 3.1 图书导入流程

```
用户点击"导入图书"
       │
       ▼
window.electronAPI.openFileDialog()
       │  (IPC → Main Process)
       ▼
Native File Dialog (系统对话框)
       │
       ▼ (返回 filePath)
window.electronAPI.readFile(filePath)
       │  (IPC → Main Process → fs.readFile)
       ▼ (返回 Uint8Array)
new ePub(arrayBuffer)
       │
       ├── book.loaded.metadata → title, author
       ├── book.coverUrl() → coverImage (blob URL)
       │
       ▼
useBookStore.addBook(newBook)
       │
       ▼
localforage (IndexedDB) 持久化
```

### 3.2 阅读渲染流程

```
用户点击书架上的书
       │
       ▼
<App> 切换 currentBook 状态
       │
       ▼
<Reader> 组件挂载 (useEffect)
       │
       ├── window.electronAPI.readFile(book.filePath)
       │
       ├── new ePub(arrayBuffer) → epubBook
       │
       ├── epubBook.locations.generate(1600) → 进度索引
       │
       ├── epubBook.renderTo(viewerRef) → rendition
       │
       ├── rendition.themes.register() → 注册主题
       │
       ├── rendition.display(lastReadCfi?) → 跳转位置
       │
       ▼
rendition.on('relocated', location => {
  useBookStore.updateBookProgress(id, location.start.cfi)
})
```

### 3.3 主题切换流程

```
用户修改设置 (如切换夜间模式)
       │
       ▼
React State 更新: currentTheme = 'dark'
       │
       ▼ (useEffect 监听)
rendition.themes.select('dark')
rendition.themes.fontSize(fontSize + '%')
rendition.themes.override('font-family', fontFamily)
       │
       ▼
epub.js 注入 CSS 到 iframe 内部
       │
       ▼
UI 实时更新
```

---

## 4. 文件结构与导入关系

```
main.ts (主进程入口)
    └── 无导入（独立运行）

preload.ts (预加载)
    └── 无导入（独立运行）

main.tsx (React 入口)
    └── App.tsx
            └── Bookshelf.tsx
            │       └── bookStore.ts (zustand)
            │               └── types.ts
            └── Reader.tsx
                    ├── bookStore.ts
                    └── types.ts
```

---

## 5. 状态管理架构

### 5.1 Zustand Store 结构

```
useBookStore
├── State
│   └── books: Book[]
│
├── Actions
│   ├── addBook(book)
│   ├── removeBook(id)
│   ├── updateBookProgress(id, cfi)
│   ├── addBookmark(bookId, bookmark)
│   └── removeBookmark(bookId, cfi)
│
└── Persistence
    └── localforage (IndexedDB)
            │
            ▼
        'anx-book-storage' (storage name)
```

### 5.2 Book 数据模型

```typescript
interface Book {
  id: string              // UUID，唯一标识
  title: string           // 书名
  author: string          // 作者
  coverImage?: string     // 封面图 (base64)
  lastReadCfi?: string    // 上次阅读位置 (EPUB CFI)
  addedDate: number       // 添加时间戳
  filePath: string        // 文件路径
  bookmarks?: Bookmark[]   // 书签列表
}

interface Bookmark {
  cfi: string    // EPUB CFI 定位符
  text: string   // 书签文本摘录
  label: string  // 显示标签 (如 "进度: 45.5%")
  time: number    // 创建时间戳
}
```

---

## 6. epub.js 核心概念

### 6.1 Book Instance

```typescript
const book = ePub(arrayBuffer)

// 核心属性
book.spine      // 书脊 - 章节顺序管理
book.locations  // 位置索引 - 用于进度计算
book.loaded.navigation  // TOC 目录

// 核心方法
book.ready          // 等待解析完成
book.getRange(cfi)  // 获取 CFI 位置的内容
book.destroy()      // 销毁实例
```

### 6.2 Rendition Instance

```typescript
const rendition = book.renderTo(domElement, options)

// 核心方法
rendition.display(cfi?)     // 跳转到指定位置
rendition.prev()            // 上一页
rendition.next()            // 下一页
rendition.themes.select()   // 切换主题
rendition.themes.fontSize() // 设置字号

// 核心事件
rendition.on('relocated', location => {
  // 位置变化时触发
})
```

### 6.3 CFI (EPUB Canonical Fragment Identifier)

EPUB 内部定位标准，用于：
- 标记阅读位置
- 跳转指定章节
- 书签定位

格式示例：`epubcfi(/6/4[chap01]!/4/2/1:0)`

---

## 7. 安全模型

### 7.1 进程隔离

```
┌─────────────────┐      ┌─────────────────┐
│  Main Process   │      │ Renderer Process │
│   (Node.js)     │      │   (Browser)      │
│                 │      │                  │
│  ✓ fs 模块      │      │  ✗ 无 Node 访问  │
│  ✓ dialog 模块  │      │  ✗ 无 fs 模块    │
│  ✓ 系统 API     │      │                  │
└────────┬────────┘      └────────┬─────────┘
         │                        │
         │    contextBridge        │
         │◄──────────────────────►│
         │    (唯一安全通道)        │
```

### 7.2 contextBridge 的作用

```typescript
// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
})

// 渲染进程无法直接访问：
// - ipcRenderer
// - Node.js 模块
// - fs 系统模块
```

---

## 8. 已知架构问题

### 8.1 Reader.tsx 单一职责问题

**问题**：`Reader.tsx` (560行) 承担了过多职责

**建议拆分**：
```
components/
├── Reader/
│   ├── index.tsx              # 主容器
│   ├── Toolbar.tsx            # 顶部工具栏
│   ├── Sidebar.tsx            # 侧边栏
│   ├── ProgressBar.tsx        # 底部进度条
│   └── Settings.tsx           # 设置面板
│
├── hooks/
│   ├── useEpubEngine.ts       # epub.js 封装
│   ├── useReaderTheme.ts      # 主题管理
│   ├── useReaderKeyboard.ts   # 键盘事件
│   └── useReaderProgress.ts   # 进度追踪
```

### 8.2 错误边界缺失

**问题**：epub.js 解析失败时无降级 UI

**建议**：添加 ErrorBoundary 组件

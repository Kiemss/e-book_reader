# 模块接口文档

## 1. Electron IPC API

### 1.1 Main Process Handlers

#### `dialog:openFile`

打开系统文件对话框，选择 EPUB 文件。

```typescript
// main.ts
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'eBooks', extensions: ['epub'] }]
  })

  if (canceled || filePaths.length === 0) {
    return null
  }
  return filePaths[0]
})
```

**返回值**：`string | null` - 选中的文件路径，或用户取消时返回 `null`

---

#### `fs:readFile`

读取指定路径的文件内容。

```typescript
// main.ts
ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  try {
    const buffer = await fs.promises.readFile(filePath)
    return buffer  // Buffer (Uint8Array)
  } catch (e) {
    console.error(e)
    return null
  }
})
```

**参数**：`filePath: string` - 要读取的文件路径

**返回值**：`Uint8Array | null` - 文件内容缓冲区，或失败时返回 `null`

---

### 1.2 Preload Bridge

```typescript
// preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
})
```

---

### 1.3 Renderer Process Usage

```typescript
// Bookshelf.tsx
const filePath = await window.electronAPI.openFileDialog()
const fileBuffer = await window.electronAPI.readFile(filePath)
```

**类型声明**：

```typescript
// types.ts (全局声明)
declare global {
  interface Window {
    electronAPI: {
      openFileDialog: () => Promise<string | null>
      readFile: (path: string) => Promise<Uint8Array | null>
    }
  }
}
```

---

## 2. Zustand Store API

### 2.1 BookStore State

```typescript
interface BookStoreState {
  books: Book[]

  addBook: (book: Book) => void
  removeBook: (id: string) => void
  updateBookProgress: (id: string, cfi: string) => void
  addBookmark: (bookId: string, bookmark: Bookmark) => void
  removeBookmark: (bookId: string, cfi: string) => void
}
```

### 2.2 BookStore Methods

#### `books`

当前书架中的所有书籍。

```typescript
const books = useBookStore(state => state.books)
```

#### `addBook(book)`

添加一本书到书架。

```typescript
// 类型
addBook: (book: Book) => void

// 使用
const newBook: Book = {
  id: crypto.randomUUID(),
  title: '书名',
  author: '作者',
  filePath: '/path/to/book.epub',
  addedDate: Date.now()
}
addBook(newBook)
```

**注意**：会自动去重（相同 `id` 或 `filePath` 的书不会重复添加）

---

#### `removeBook(id)`

从书架中移除一本书。

```typescript
// 类型
removeBook: (id: string) => void

// 使用
removeBook('book-uuid')
```

**注意**：仅从状态移除，不删除源文件

---

#### `updateBookProgress(id, cfi)`

更新书籍的阅读进度（CFI 位置）。

```typescript
// 类型
updateBookProgress: (id: string, cfi: string) => void

// 使用
updateBookProgress('book-uuid', 'epubcfi(/6/4[chap01]!/4/2/1:0)')
```

**触发时机**：`Reader` 组件中 `rendition.on('relocated')` 事件

---

#### `addBookmark(bookId, bookmark)`

添加书签到指定书籍。

```typescript
// 类型
addBookmark: (bookId: string, bookmark: Bookmark) => void

// 使用
addBookmark('book-uuid', {
  cfi: 'epubcfi(/6/4[chap01]!/4/2/1:0)',
  text: '这是书签位置的文本摘录...',
  label: '进度: 45.5%',
  time: Date.now()
})
```

**注意**：会自动去重（相同 `cfi` 的书签不会重复添加）

---

#### `removeBookmark(bookId, cfi)`

删除指定书籍的书签。

```typescript
// 类型
removeBookmark: (bookId: string, cfi: string) => void

// 使用
removeBookmark('book-uuid', 'epubcfi(/6/4[chap01]!/4/2/1:0)')
```

---

## 3. 数据类型定义

### 3.1 Book

```typescript
interface Book {
  id: string              // UUID，唯一标识
  title: string           // 书名
  author: string          // 作者
  coverImage?: string     // 封面图 (base64 data URL 或普通 URL)
  lastReadCfi?: string    // 上次阅读位置 (EPUB CFI)
  addedDate: number       // 添加到书架的时间戳
  filePath: string        // EPUB 文件路径
  bookmarks?: Bookmark[]  // 书签列表
}
```

### 3.2 Bookmark

```typescript
interface Bookmark {
  cfi: string    // EPUB CFI 定位符
  text: string   // 书签位置的文本摘录
  label: string  // 显示标签 (如 "进度: 45.5%")
  time: number    // 创建时间戳
}
```

---

## 4. epub.js API

### 4.1 Book Instance

```typescript
import ePub, { Book as EPubBook } from 'epubjs'

// 初始化
const book = ePub(arrayBuffer: ArrayBuffer): EPubBook

// 等待解析完成
await book.ready

// 获取元数据
const metadata = await book.loaded.metadata
// metadata.title
// metadata.creator (作者)

// 获取封面 URL
const coverUrl = await book.coverUrl()
// 返回 blob: URL 或普通 URL

// 获取目录
const nav = await book.loaded.navigation
// nav.toc - NavItem[] 目录树

// 生成位置索引（用于进度计算）
await book.locations.generate(charsPerLocation: number)

// 获取进度百分比
const pct = book.locations.percentageFromCfi(cfi: string)

// 从百分比获取 CFI
const cfi = book.locations.cfiFromPercentage(pct: number)

// 销毁实例
book.destroy()
```

### 4.2 Rendition Instance

```typescript
import { Rendition } from 'epubjs'

// 渲染到 DOM
const rendition = book.renderTo(domElement: HTMLElement, options?: {
  width?: string | number
  height?: string | number
  spread?: 'none' | 'auto' | 'preload' | 'pdf'
  allowScriptedContent?: boolean
}): Rendition

// 跳转到位置
await rendition.display(cfi?: string | href: string)

// 上一页
await rendition.prev()

// 下一页
await rendition.next()

// 注册主题
rendition.themes.register(themeId: string, styles: object)
rendition.themes.select(themeId: string)

// 设置字号
rendition.themes.fontSize(size: string)  // 如 '120%'

// 覆盖 CSS 属性
rendition.themes.override(property: string, value: string)
rendition.themes.override('line-height', '1.8')
rendition.themes.override('font-family', 'Georgia, serif')

// 监听事件
rendition.on('relocated', (location: Location) => {
  location.start.cfi    // 当前页 CFI
  location.start.href   // 当前页 URL
  location.end.cfi      // 下一页 CFI
})
```

### 4.3 Navigation / TOC

```typescript
interface NavItem {
  id: string
  href: string      // 跳转链接
  label: string     // 显示文本
  subitems?: NavItem[]  // 子章节
}

// 获取目录
const nav = await book.loaded.navigation
nav.toc.forEach(item => {
  console.log(item.label, item.href)
  item.subitems?.forEach(sub => {
    console.log('  ', sub.label, sub.href)
  })
})
```

---

## 5. React 组件接口

### 5.1 App Props

```typescript
// App.tsx - 无 props
function App() {
  const [currentBook, setCurrentBook] = useState<Book | null>(null)
  // ...
}
```

### 5.2 Bookshelf Props

```typescript
interface BookshelfProps {
  onBookClick: (book: Book) => void
}

// 使用
<Bookshelf onBookClick={(book) => setCurrentBook(book)} />
```

### 5.3 Reader Props

```typescript
interface ReaderProps {
  book: Book           // 要阅读的书籍
  onBack: () => void   // 返回书架的回调
}

// 使用
<Reader book={currentBook} onBack={() => setCurrentBook(null)} />
```

---

## 6. 常量配置

### 6.1 阅读器主题

```typescript
const THEMES = {
  light: { background: '#ffffff', color: '#333333' },
  sepia: { background: '#fdf6e3', color: '#433422' },
  dark:  { background: '#1e1e1e', color: '#cccccc' }
}

type ThemeKey = keyof typeof THEMES
```

### 6.2 可选字体

```typescript
const FONTS = [
  { name: 'System Default', value: 'system-ui, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Monospace', value: 'Consolas, monospace' }
]
```

### 6.3 默认设置

```typescript
const DEFAULT_SETTINGS = {
  fontSize: 100,      // 100%
  lineHeight: 1.5,
  fontFamily: 'system-ui, sans-serif',
  theme: 'sepia' as ThemeKey,
  idleTimeout: 3000,  // 3秒
}
```

---

## 7. 快捷键定义

| 快捷键 | 功能 |
|--------|------|
| `←` / `→` | 上一页 / 下一页 |
| `PageUp` / `PageDown` | 上一页 / 下一页 |
| `Space` | 下一页 |
| `Shift + Space` | 上一页 |
| `F11` | 切换全屏 |
| `Escape` | 退出全屏 / 返回书架 |
| `Enter` | 确认搜索 |

---

## 8. 持久化存储

### 8.1 Storage 配置

```typescript
const useBookStore = create<BookStoreState>()(
  persist(
    (set) => ({ /* ... */ }),
    {
      name: 'anx-book-storage',          // localforage key
      storage: createJSONStorage(() => localforage),
    }
  )
)
```

### 8.2 IndexedDB 结构

```
Database: localforage
  └── Key: 'anx-book-storage'
        └── Value: { books: Book[] }
```

---

## 9. 文件路径说明

### 9.1 开发环境

```
app/
├── electron/
│   ├── main.ts       → dist-electron/main.js
│   └── preload.ts    → dist-electron/preload.js
├── src/              → 打包到 dist/
└── index.html        → dist/index.html
```

### 9.2 生产环境

```
app/
├── release/          → 构建产物
│   └── win-unpacked/ # 可直接运行
│       └── *.exe
└── dist/            → Web 资源
    └── index.html
```

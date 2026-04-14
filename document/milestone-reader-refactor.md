# 阅读器架构重构 Milestone

## 目标
统一 EPUB、TXT、MD 三种格式阅读器的用户界面和交互逻辑，提高代码复用性和可维护性。

## 现状问题
| 特性 | Reader.tsx (EPUB) | TextReader.tsx (TXT) | MarkdownReader.tsx (MD) |
|------|-------------------|----------------------|-------------------------|
| 边栏位置 | 左侧固定 | 右侧 | 右侧 |
| 侧边栏内容 | 目录/书签/搜索 Tab | 仅书签 | 目录/书签 |
| 设置位置 | 顶部栏下拉 | 右侧面板 | 右侧面板 |
| 导航方式 | epub.js 翻页 | 翻页按钮+点击翻页 | 滚动 |
| 全屏 | 支持 | ❌ | ❌ |

---

## 架构设计

### 目录结构
```
src/
├── hooks/
│   ├── useIdle.ts          # 自动隐藏 UI 逻辑
│   ├── useReaderSettings.ts # 主题/字号/字体状态
│   ├── useProgress.ts      # 阅读进度管理
│   └── useBookmark.ts      # 书签管理
├── components/
│   ├── ReaderHeader.tsx    # 统一顶部栏
│   ├── ReaderSidebar.tsx   # 统一侧边栏框架
│   ├── ReaderSettings.tsx # 统一样式设置面板
│   ├── ReaderProgress.tsx # 统一进度条
│   ├── Reader.tsx          # EPUB 阅读器 (重构)
│   ├── TextReader.tsx      # TXT 阅读器 (重构)
│   └── MarkdownReader.tsx # MD 阅读器 (重构)
```

---

## 接口定义

### 1. useIdle Hook
```typescript
interface UseIdleOptions {
  timeout: number  // 毫秒，默认 3000
  enabled?: boolean
}

interface UseIdleReturn {
  isIdle: boolean
  resetIdle: () => void
}

// 使用方式
const { isIdle, resetIdle } = useIdle({ timeout: 3000 })
```

### 2. useReaderSettings Hook
```typescript
type Theme = 'light' | 'sepia' | 'dark'

interface FontOption {
  name: string
  value: string
}

interface ReaderSettings {
  theme: Theme
  fontSize: number      // 百分比 50-200
  lineHeight: number     // 1-3
  fontFamily: string
}

interface UseReaderSettingsReturn {
  settings: ReaderSettings
  setTheme: (theme: Theme) => void
  setFontSize: (size: number) => void
  setLineHeight: (height: number) => void
  setFontFamily: (family: string) => void
  getThemeColors: () => { bg: string; text: string; codeBg: string }
}

// 使用方式
const { settings, setTheme, getThemeColors } = useReaderSettings()
```

### 3. useProgress Hook
```typescript
interface UseProgressOptions {
  bookId: string
  storageKey?: 'epubProgress' | 'txtProgress'
}

interface UseProgressReturn {
  progress: number        // 0-100
  currentLocation: string  // 当前位置标识
  setProgress: (progress: number) => void
  updateLocation: (location: string) => void
}

// 使用方式
const { progress, setProgress } = useProgress({ bookId: book.id })
```

### 4. useBookmark Hook
```typescript
interface Bookmark {
  id: string
  label: string        // 显示标签
  text: string         // 摘录文字
  location: string     // 位置标识 (cfi/page/id)
  time: number         // 时间戳
}

interface UseBookmarkOptions {
  bookId: string
}

interface UseBookmarkReturn {
  bookmarks: Bookmark[]
  currentBookmark: Bookmark | null
  isBookmarked: boolean
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'time'>) => void
  removeBookmark: (id: string) => void
  toggleBookmark: () => void
  goToBookmark: (bookmark: Bookmark) => void
}

// 使用方式
const { bookmarks, addBookmark, isBookmarked } = useBookmark({ bookId: book.id })
```

### 5. ReaderHeader Props
```typescript
interface ReaderHeaderProps {
  title: string
  isIdle: boolean
  isSidebarOpen: boolean
  isSettingsOpen: boolean
  progress: number
  onBack: () => void
  onToggleSidebar: () => void
  onToggleSettings: () => void
  onToggleFullscreen?: () => void
  isFullscreen?: boolean
  isDark?: boolean
}
```

### 6. ReaderSidebar Props
```typescript
type SidebarTab = 'TOC' | 'BOOKMARK' | 'SEARCH'

interface TocItem {
  id: string
  label: string
  href?: string
  subitems?: TocItem[]
}

interface ReaderSidebarProps {
  isOpen: boolean
  activeTab: SidebarTab
  isDark: boolean
  // TOC
  toc: TocItem[]
  onTocClick: (item: TocItem) => void
  // Bookmark
  bookmarks: Bookmark[]
  onBookmarkClick: (bookmark: Bookmark) => void
  onRemoveBookmark: (id: string) => void
  // Search
  searchQuery: string
  searchResults: SearchResult[]
  isSearching: boolean
  onSearchChange: (query: string) => void
  onSearch: () => void
  onSearchResultClick: (result: SearchResult) => void
  // Common
  onClose: () => void
}

interface SearchResult {
  id: string
  label: string
  excerpt: string
  cfi?: string
}
```

### 7. ReaderSettings Props
```typescript
interface ReaderSettingsProps {
  isOpen: boolean
  isDark: boolean
  settings: ReaderSettings
  onThemeChange: (theme: Theme) => void
  onFontSizeChange: (size: number) => void
  onLineHeightChange: (height: number) => void
  onFontFamilyChange: (family: string) => void
  onClose: () => void
}
```

### 8. ReaderProgress Props
```typescript
interface ReaderProgressProps {
  progress: number
  isIdle: boolean
  isDark: boolean
  isLocationsReady?: boolean
  onProgressChange: (progress: number) => void
}
```

---

## 执行计划

### Phase 1: 创建共享 Hooks
- [ ] `src/hooks/useIdle.ts`
- [ ] `src/hooks/useReaderSettings.ts`
- [ ] `src/hooks/useProgress.ts`
- [ ] `src/hooks/useBookmark.ts`

### Phase 2: 创建共享组件
- [ ] `src/components/ReaderHeader.tsx`
- [ ] `src/components/ReaderSidebar.tsx`
- [ ] `src/components/ReaderSettings.tsx`
- [ ] `src/components/ReaderProgress.tsx`

### Phase 3: 重构阅读器
- [ ] 重构 `Reader.tsx` (EPUB)
- [ ] 重构 `TextReader.tsx`
- [ ] 重构 `MarkdownReader.tsx`

### Phase 4: 测试验证
- [ ] 测试 EPUB 阅读器
- [ ] 测试 TXT 阅读器
- [ ] 测试 MD 阅读器

---

## 设计原则

1. **统一性**: 所有阅读器使用相同的布局结构和交互逻辑
2. **可扩展性**: 新增格式时只需创建新的 Reader 并复用共享组件
3. **解耦性**: hooks 和组件独立，不相互依赖
4. **一致性**: 主题、字号、进度条等 UI 元素保持一致

---

## 预期效果

| 特性 | 重构前 | 重构后 |
|------|--------|--------|
| 边栏位置 | 各阅读器不同 | 统一左侧 |
| 侧边栏内容 | 不一致 | 目录/书签/搜索 Tab |
| 设置交互 | 不一致 | 统一下拉面板 |
| 全屏支持 | 仅 EPUB | 全部支持 |
| 代码复用 | 0% | ~60% |

---

## 已知问题 (待修复)

### 1. EPUB 进度条问题
- **现象**: 进度条不更新，拖动无效
- **可能原因**: `isLocationsReady` 状态或 `handleProgressChange` 中的 CFI 转换问题
- **相关文件**: `Reader.tsx`

### 2. MD 文件进度保存/恢复问题
- **现象**: 关闭 MD 文件后重新打开，滚动位置没有恢复到上次位置
- **可能原因**: `characterOffset` 值的计算或恢复时机问题
- **相关文件**: `MarkdownReader.tsx`

---

## Changelog

### v0.2.0 (2026-04-14)
- 新增 MD (Markdown) 格式支持
- 重构阅读器架构，统一 UI 组件
- 新增共享 hooks: useIdle, useReaderSettings
- 新增共享组件: ReaderHeader, ReaderSidebar, ReaderSettingsPanel, ReaderProgress
- 添加书签功能（部分问题待修复）

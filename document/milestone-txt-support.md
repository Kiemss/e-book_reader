# Milestone: TXT 电子书支持

## 目标
为电子书阅读器添加 TXT 格式支持，让用户可以阅读纯文本文件。

## 背景

TXT 是最通用、最简单的电子书格式，无需复杂解析，适合快速添加。

## 技术方案

### 现状
- 当前仅支持 EPUB 格式（使用 epub.js）
- Bookshelf 通过 `window.electronAPI.openFileDialog()` 选择文件
- Reader 组件使用 epub.js 渲染

### 方案
```
TXT 文件 ──► FileReader API ──► 文本内容
                                    │
                                    ▼
                              分页处理
                                    │
                                    ▼
                              TextReader 组件渲染
```

### 关键技术点

1. **FileReader API**：读取本地 txt 文件
2. **分页算法**：按字符数/行数分页，支持进度记忆
3. **编码检测**：支持 UTF-8、GBK 等常见编码
4. **进度保存**：使用类似 EPUB CFI 的方式保存阅读位置（字符偏移量）

---

## 工作流程

### Step 1: 准备工作

- [ ] 分析现有代码结构
- [ ] 设计 TXT 数据模型

### Step 2: 类型定义

- [ ] 修改 `types.ts`，添加 `BookFormat` 枚举
- [ ] 修改 `Book` 接口，添加 `format` 字段
- [ ] 添加 `TXTProgress` 类型用于进度记忆

### Step 3: Electron 配置

- [ ] 修改 `main.ts` 的文件对话框，过滤器添加 `.txt`
- [ ] 添加 TXT 文件读取的 IPC handler（如需要）

### Step 4: TXT 解析模块

- [ ] 创建 `utils/txtParser.ts`
- [ ] 实现 `parseTxtFile(file: File): Promise<TxtBook>`
- [ ] 实现 `splitIntoPages(content: string, pageSize: number): string[]`
- [ ] 实现 `detectEncoding(buffer: ArrayBuffer): string`

### Step 5: Bookshelf 修改

- [ ] 修改文件类型过滤，支持 `.txt`
- [ ] 根据文件类型调用不同解析器
- [ ] TXT 书籍显示特殊图标

### Step 6: TextReader 组件

- [ ] 创建 `components/TextReader.tsx`
- [ ] 实现翻页逻辑（键盘/鼠标/按钮）
- [ ] 实现进度追踪和保存
- [ ] 实现主题切换（复用现有主题）
- [ ] 实现设置面板（字体大小、行距）
- [ ] 实现书签功能

### Step 7: App.tsx 路由整合

- [ ] 修改 App.tsx，根据 `book.format` 渲染不同阅读器
- [ ] EPUB → Reader 组件
- [ ] TXT → TextReader 组件

### Step 8: 测试验证

- [ ] 测试 TXT 文件导入
- [ ] 测试翻页功能
- [ ] 测试进度记忆
- [ ] 测试主题切换
- [ ] 测试书签功能

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/src/types.ts` | 修改 | 添加格式枚举和数据类型 |
| `app/electron/main.ts` | 修改 | 添加 .txt 文件过滤器 |
| `app/src/utils/txtParser.ts` | 新增 | TXT 解析工具 |
| `app/src/components/TextReader.tsx` | 新增 | TXT 阅读器组件 |
| `app/src/components/Bookshelf.tsx` | 修改 | 支持 TXT 导入 |
| `app/src/App.tsx` | 修改 | 路由逻辑 |

---

## 数据模型

```typescript
// 书籍格式枚举
enum BookFormat {
  EPUB = 'epub',
  TXT = 'txt'
}

// TXT 书籍
interface TXTBook {
  id: string
  title: string
  author: string
  content: string      // 完整文本内容
  pageCount: number    // 总页数
  encoding: string     // 编码
  filePath: string
}

// 阅读进度
interface TXTProgress {
  currentPage: number
  characterOffset: number  // 字符偏移量（用于精确恢复位置）
}

// Book 接口扩展
interface Book {
  // ... 现有字段
  format: BookFormat       // 新增
  txtProgress?: TXTProgress // TXT 特有
}
```

---

## TextReader 组件接口

```typescript
interface TextReaderProps {
  book: TXTBook           // TXT 书籍数据
  initialPage?: number    // 初始页码
  onProgress: (page: number, offset: number) => void  // 进度回调
  onBack: () => void     // 返回回调
}
```

---

## 预计工作量

| 步骤 | 工作量 | 优先级 |
|------|--------|--------|
| 类型定义 | 1 小时 | P0 |
| Electron 配置 | 30 分钟 | P0 |
| TXT 解析模块 | 2 小时 | P0 |
| Bookshelf 修改 | 1 小时 | P0 |
| TextReader 组件 | 4 小时 | P0 |
| App.tsx 整合 | 1 小时 | P0 |
| 测试 | 2 小时 | P0 |
| **总计** | **~12 小时** | |

---

## 依赖安装

```bash
cd app
# 预计需要（如果需要编码检测库）
npm install jschardet
npm install --save-dev @types/jschardet
```

---

## 注意事项

1. **编码问题**：TXT 文件编码多样，需要自动检测
2. **大文件处理**：超大 TXT 文件需要流式读取和虚拟滚动
3. **进度精度**：使用字符偏移量而非页码，确保精确恢复
4. **代码复用**：尽可能复用 Reader 的主题、设置逻辑

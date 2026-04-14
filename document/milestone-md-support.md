# Milestone: MD (Markdown) 电子书支持

## 目标
为电子书阅读器添加 Markdown (.md) 格式支持，支持渲染 Markdown 语法。

## 背景

MD 文件本质是纯文本，但需要渲染 Markdown 语法才能有良好的阅读体验。技术上可以复用 TXT 的解析逻辑，只需在渲染时将 Markdown 转换为 HTML。

## 技术方案

### 现状
- 已支持 EPUB 和 TXT 格式
- TextReader 组件已实现完整的阅读功能
- txtParser 模块包含编码检测、分页、元数据提取

### 方案
```
MD 文件 ──► FileReader API ──► 原始文本
                                    │
                                    ▼
                              解析 Markdown
                              (marked.js)
                                    │
                                    ▼
                              HTML 输出
                                    │
                                    ▼
                              渲染到 DOM
                              (复用 TextReader 架构)
```

### 关键技术点

1. **marked.js**：Markdown 转 HTML 的标准库
2. **代码高亮**：highlight.js 支持代码块语法高亮
3. **分页策略**：按自然段落分页，保证 Markdown 块级元素完整
4. **样式适配**：确保渲染后的 HTML 符合阅读器主题

---

## 工作流程

### Step 1: 准备工作

- [ ] 分析现有 TextReader 架构
- [ ] 设计 Markdown 渲染策略

### Step 2: 类型定义

- [ ] 修改 `types.ts`，`BookFormat` 添加 `MD`
- [ ] 添加 `MDProgress` 类型（与 `TXTProgress` 共用）

### Step 3: Electron 配置

- [ ] 修改 `main.ts` 的文件对话框，过滤器添加 `.md`

### Step 4: MD 解析模块

- [ ] 创建 `utils/mdParser.ts`
- [ ] 安装 marked 和 highlight.js
- [ ] 实现 `parseMdFile(file: File): Promise<string>` 返回 HTML
- [ ] 实现 `splitMdIntoPages(html: string, pageSize: number): string[]`

### Step 5: 创建 MarkdownReader 组件

- [ ] 复制 `TextReader.tsx` 为基础
- [ ] 修改渲染逻辑，直接输出 HTML
- [ ] 添加 marked.js 渲染
- [ ] 添加 highlight.js 代码高亮

### Step 6: Bookshelf 修改

- [ ] 修改文件类型检测，支持 `.md`
- [ ] 根据文件类型调用不同解析器

### Step 7: App.tsx 路由整合

- [ ] 修改 App.tsx，根据 `book.format` 路由：
  - `BookFormat.EPUB` → Reader
  - `BookFormat.TXT` → TextReader
  - `BookFormat.MD` → MarkdownReader

### Step 8: 测试验证

- [ ] 测试 MD 文件导入
- [ ] 测试 Markdown 渲染（标题/列表/代码块/链接等）
- [ ] 测试翻页功能
- [ ] 测试进度记忆
- [ ] 测试代码高亮

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/src/types.ts` | 修改 | 添加 `BookFormat.MD` |
| `app/electron/main.ts` | 修改 | 添加 .md 文件过滤器 |
| `app/src/utils/mdParser.ts` | 新增 | MD 解析 + Markdown 渲染 |
| `app/src/components/MarkdownReader.tsx` | 新增 | MD 阅读器组件（基于 TextReader） |
| `app/src/components/Bookshelf.tsx` | 修改 | 支持 MD 导入 |
| `app/src/App.tsx` | 修改 | 添加 MD 路由 |

---

## 数据模型

```typescript
// BookFormat 扩展
export const BookFormat = {
  EPUB: 'epub',
  TXT: 'txt',
  MD: 'md',  // 新增
} as const

// MD 与 TXT 共用进度类型
export interface TXTProgress {
  currentPage: number;
  characterOffset: number;
}

// Book 接口已支持，无需修改
```

---

## 依赖安装

```bash
cd app
npm install marked
npm install highlight.js
npm install --save-dev @types/marked  # 如果需要类型
```

---

## marked.js 配置

```typescript
import { marked } from 'marked'
import hljs from 'highlight.js'

marked.setOptions({
  breaks: true,
  gfm: true,
})

// 自定义代码高亮
marked.use({
  renderer: {
    code(code: string, language: string) {
      if (language && hljs.getLanguage(language)) {
        const highlighted = hljs.highlight(code, { language }).value
        return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
      }
      return `<pre><code>${code}</code></pre>`
    }
  }
})
```

---

## MarkdownReader 渲染策略

### 分页原则
- 按 `</p>` `</h1>` `</h2>` `</li>` 等块级元素分页
- 确保不会切断 Markdown 元素
- 代码块保持完整不分割

### CSS 适配
```css
.markdown-reader {
  font-family: system-ui, sans-serif;
  line-height: 1.8;
}

.markdown-reader h1 { font-size: 1.8em; margin: 1em 0; }
.markdown-reader h2 { font-size: 1.5em; margin: 0.8em 0; }
.markdown-reader h3 { font-size: 1.2em; margin: 0.6em 0; }
.markdown-reader p { margin: 0.5em 0; }
.markdown-reader code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; }
.markdown-reader pre { background: #1e1e1e; color: #d4d4d4; padding: 1em; overflow-x: auto; }
.markdown-reader blockquote { border-left: 3px solid #ddd; padding-left: 1em; color: #666; }
```

---

## 预计工作量

| 步骤 | 工作量 | 优先级 |
|------|--------|--------|
| 类型定义 | 10 分钟 | P0 |
| Electron 配置 | 10 分钟 | P0 |
| MD 解析模块 | 30 分钟 | P0 |
| MarkdownReader 组件 | 2 小时 | P0 |
| Bookshelf 修改 | 15 分钟 | P0 |
| App.tsx 整合 | 15 分钟 | P0 |
| 测试 | 1 小时 | P0 |
| **总计** | **~5 小时** | |

---

## 注意事项

1. **代码块分页**：代码块不应被分页切断
2. **XSS 防护**：Markdown 渲染的 HTML 需要防注入
3. **大文件处理**：超大 MD 文件需要虚拟滚动
4. **图片处理**：MD 中的图片需要处理相对路径问题
5. **代码高亮主题**：需要适配阅读器的主题（浅色/深色）

# 开发指南

## 1. 环境准备

### 1.1 系统要求

- Windows 10/11 或 macOS/Linux
- Node.js 18+ (推荐 20+)
- Git

### 1.2 安装步骤

```bash
# 克隆仓库
git clone https://github.com/Kiemss/e-book_reader.git

# 进入目录
cd e-book_reader

# 安装依赖
cd app
npm install
```

### 1.3 开发命令

```bash
# 开发模式（热重载）
npm run dev

# 类型检查
npm run lint

# 构建 Web 资源
npm run build

# 构建 Electron 应用
npm run dist

# 预览构建结果
npm run preview
```

---

## 2. 项目结构

### 2.1 目录说明

```
app/
├── electron/           # Electron 主进程代码
│   ├── main.ts        # 主进程入口
│   └── preload.ts     # 预加载脚本
│
├── src/               # React 渲染进程代码
│   ├── components/    # React 组件
│   ├── store/         # Zustand 状态管理
│   ├── types.ts       # 类型定义
│   ├── App.tsx        # 根组件
│   └── main.tsx       # React 入口
│
├── public/            # 静态资源
├── dist/             # 构建输出 (Web)
├── dist-electron/     # 构建输出 (Electron)
├── release/          # 最终发布包
│
├── package.json      # 依赖配置
└── vite.config.ts    # Vite 构建配置
```

---

## 3. 开发流程

### 3.1 添加新功能

1. 创建功能分支
```bash
git checkout -b feature/your-feature
```

2. 在 `app/src/components/` 添加组件
3. 在 `app/src/store/` 添加状态（如需要）
4. 更新 `app/src/types.ts`（如需要新类型）

5. 提交代码
```bash
git add .
git commit -m "feat: 添加新功能"
```

6. 推送分支
```bash
git push origin feature/your-feature
```

7. 创建 Pull Request

### 3.2 修改现有功能

1. 确保在 `main` 分支最新
```bash
git checkout main
git fetch upstream
git merge upstream/main
```

2. 创建修复分支
```bash
git checkout -b fix/your-fix
```

3. 修改代码并测试
4. 提交并推送

---

## 4. 调试技巧

### 4.1 渲染进程调试

开发模式下，Electron 窗口会自动打开 DevTools。

快捷键：`F12` 或 `Ctrl+Shift+I`

### 4.2 主进程调试

在 `main.ts` 中添加日志：

```typescript
console.log('[Main] 调试信息', someVariable)
```

查看日志：在终端或 DevTools Console 中

### 4.3 epub.js 调试

```typescript
// 在 Reader.tsx 中
const book = ePub(arrayBuffer)

// 添加详细日志
book.on('error', (err) => {
  console.error('[epub.js Error]', err)
})
```

### 4.4 State 调试

使用 Zustand DevTools（开发环境自动启用）：

```typescript
// 在 DevTools -> Redux/Fox，消费者可以查看状态变化
```

---

## 5. 测试清单

### 5.1 功能测试

- [ ] 导入 EPUB 文件
- [ ] 删除书籍
- [ ] 打开书籍阅读
- [ ] 翻页（键盘/鼠标/按钮）
- [ ] 目录导航
- [ ] 主题切换
- [ ] 字体/字号调整
- [ ] 添加书签
- [ ] 删除书签
- [ ] 全文搜索
- [ ] 进度记忆
- [ ] 全屏切换
- [ ] 沉浸模式
- [ ] 返回书架

### 5.2 边界测试

- [ ] 导入无效文件
- [ ] 导入重复书籍
- [ ] 删除正在阅读的书籍
- [ ] 关闭应用后重新打开（进度保持）
- [ ] 导入没有封面的 EPUB
- [ ] 导入没有目录的 EPUB

---

## 6. Git 协作流程

### 6.1 Fork 工作流

```
原仓库 (upstream)        你的 Fork (origin)
┌─────────────┐         ┌─────────────┐
│congroe/ebook│         │Kiemss/ebook │
└─────────────┘         └─────────────┘
       ↑                       ↑
       │     git fetch         │
       └───────────────────────┘
              sync
```

### 6.2 同步上游代码

```bash
# 添加上游仓库（一次性）
git remote add upstream https://github.com/congroe/e-book_reader.git

# 获取上游最新
git fetch upstream

# 合并到本地 main
git checkout main
git merge upstream/main

# 推送到你的 Fork
git push origin main
```

### 6.3 发布流程

```bash
# 1. 确保 main 最新
git checkout main
git merge upstream/main

# 2. 创建标签
git tag v0.2.0

# 3. 推送标签（触发 GitHub Actions）
git push origin v0.2.0

# 4. 查看构建状态
# https://github.com/Kiemss/e-book_reader/actions

# 5. 构建成功后，在 Releases 页面查看
# https://github.com/Kiemss/e-book_reader/releases
```

---

## 7. 构建配置

### 7.1 electron-builder 配置

位于 `app/package.json` 的 `build` 字段：

```json
{
  "build": {
    "appId": "com.ebookreader.app",
    "productName": "e-book_reader",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*"
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

### 7.2 GitHub Actions 配置

位于 `.github/workflows/build.yml`：

- 触发条件：推送 `v*` 标签
- Node.js 版本：22
- 构建步骤：install → build → electron-builder → upload-artifact

---

## 8. 常见问题

### 8.1 构建失败

```bash
# 清理后重新安装
cd app
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 8.2 TypeScript 错误

```bash
# 检查类型错误
cd app
npm run lint

# 查看详细错误
npx tsc --noEmit
```

### 8.3 GitHub Actions 失败

1. 检查 Actions 日志
2. 确保 Node.js 版本正确（当前 22）
3. 确保 `package-lock.json` 在版本控制中

### 8.4 权限问题（npm install）

```bash
# Windows 管理员权限
# 或清理 npm 缓存
npm cache clean --force
```

---

## 9. AI 辅助开发提示

### 9.1 向 AI 描述项目

```
项目：Electron + React 电子书阅读器
技术栈：React 19, TypeScript, Zustand, epub.js, Tailwind CSS, Vite
架构：三进程模型（Main/Preload/Renderer）
状态管理：Zustand + localforage
```

### 9.2 参考文档位置

| 内容 | 文档 |
|------|------|
| 架构设计 | `document/ARCHITECTURE.md` |
| API 接口 | `document/MODULE_INTERFACE.md` |
| 产品需求 | `PRD.md` |

### 9.3 关键代码位置

| 功能 | 文件 |
|------|------|
| 主进程入口 | `app/electron/main.ts` |
| IPC 桥接 | `app/electron/preload.ts` |
| 书架组件 | `app/src/components/Bookshelf.tsx` |
| 阅读器组件 | `app/src/components/Reader.tsx` |
| 状态管理 | `app/src/store/bookStore.ts` |
| 类型定义 | `app/src/types.ts` |

---

## 10. 发布检查清单

- [ ] 代码已提交并推送
- [ ] 所有测试通过
- [ ] `npm run build` 成功
- [ ] 标签已创建并推送
- [ ] GitHub Actions 构建成功
- [ ] Release 已创建
- [ ] .exe 文件可以下载
- [ ] 应用程序可以正常启动
- [ ] 核心功能测试通过

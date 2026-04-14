# 📖 e-book_reader

轻量级 Windows 电子书阅读器（基于 Electron + React）

## 项目结构

```
e-book_reader/
├── app/                          # 应用主目录
│   ├── electron/                  # Electron 主进程
│   │   ├── main.ts               # 主进程入口（窗口管理/IPC）
│   │   └── preload.ts            # 预加载脚本（API桥接）
│   ├── src/                      # 渲染进程（React）
│   │   ├── components/           # React 组件
│   │   │   ├── Bookshelf.tsx     # 书架管理组件
│   │   │   └── Reader.tsx        # 阅读器组件
│   │   ├── store/                # 状态管理
│   │   │   └── bookStore.ts      # Zustand 状态库
│   │   ├── types.ts              # TypeScript 类型定义
│   │   ├── App.tsx               # 根组件
│   │   └── main.tsx              # React 入口
│   ├── package.json              # 应用依赖配置
│   └── vite.config.ts            # Vite 构建配置
├── .github/
│   └── workflows/
│       └── build.yml             # GitHub Actions 自动构建
├── document/                     # 开发文档
└── PRD.md                        # 产品需求文档
```

## 快速开始

### 开发模式

```bash
cd app
npm install
npm run dev
```

### 构建发布

```bash
cd app
npm run dist
```

发布产物位于 `app/release/` 目录。

### 自动发布（GitHub Actions）

推送标签即可触发自动构建：

```bash
git tag v0.1.0
git push origin v0.1.0
```

构建完成后访问：https://github.com/Kiemss/e-book_reader/releases

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Electron | ^41.1.0 |
| 前端框架 | React | ^19.2.4 |
| 类型系统 | TypeScript | ~5.9.3 |
| 构建工具 | Vite | ^8.0.1 |
| 状态管理 | Zustand | ^5.0.12 |
| 电子书解析 | epub.js | ^0.3.93 |
| 本地存储 | localforage | ^1.10.0 |
| UI 样式 | Tailwind CSS | ^4.2.2 |

## 核心功能

- ✅ EPUB 文件导入与管理
- ✅ 书架网格展示
- ✅ 阅读进度自动记忆
- ✅ 目录导航（TOC）
- ✅ 主题切换（浅色/护眼/夜间）
- ✅ 字体/字号/行距调节
- ✅ 书签功能
- ✅ 全文搜索
- ✅ 沉浸模式
- ✅ 全屏模式

## 文档目录

| 文档 | 说明 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 系统架构与数据流分析 |
| [MODULE_INTERFACE.md](./MODULE_INTERFACE.md) | 模块接口与 API 文档 |
| [DEV_GUIDE.md](./DEV_GUIDE.md) | 开发指南与调试手册 |

## 许可证

MIT

import { ArrowLeft, Menu, Search, Settings, Maximize, Minimize, Bookmark } from 'lucide-react'

interface ReaderHeaderProps {
  title: string
  isIdle: boolean
  isSidebarOpen: boolean
  isSettingsOpen: boolean
  progress: number
  isFullscreen?: boolean
  isDark?: boolean
  isBookmarked?: boolean
  onBack: () => void
  onToggleSidebar: () => void
  onToggleSettings: () => void
  onToggleFullscreen?: () => void
  onToggleSearch?: () => void
  onToggleBookmark?: () => void
  isSearchOpen?: boolean
}

export function ReaderHeader({
  title,
  isIdle,
  isSidebarOpen,
  isSettingsOpen,
  progress,
  isFullscreen = false,
  isDark = false,
  isBookmarked = false,
  onBack,
  onToggleSidebar,
  onToggleSettings,
  onToggleFullscreen,
  onToggleSearch,
  onToggleBookmark,
  isSearchOpen = false,
}: ReaderHeaderProps) {
  return (
    <div
      className={`absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-20 shrink-0 select-none transition-all duration-500 ${
        isIdle ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      } ${isDark ? 'bg-[#1e1e1e]/90 text-white shadow-md' : 'bg-white/90 shadow-sm backdrop-blur'}`}
    >
      <div className="flex items-center gap-4 w-1/3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-black/5 hover:text-blue-500 rounded-full transition"
          title="返回 (Esc)"
        >
          <ArrowLeft size={20} />
        </button>
        <button
          onClick={onToggleSidebar}
          className={`p-2 hover:bg-black/5 rounded-full transition ${
            isSidebarOpen ? 'bg-black/5 text-blue-500' : ''
          }`}
          title="目录"
        >
          <Menu size={20} />
        </button>
        {onToggleSearch && (
          <button
            onClick={onToggleSearch}
            className={`p-2 hover:bg-black/5 rounded-full transition ${
              isSearchOpen ? 'bg-black/5 text-blue-500' : ''
            }`}
            title="搜索"
          >
            <Search size={20} />
          </button>
        )}
      </div>

      <span className="font-medium truncate text-center flex-1">{title}</span>

      <div className="flex items-center justify-end w-1/3 gap-1 relative">
        {onToggleBookmark && (
          <button
            onClick={onToggleBookmark}
            className={`p-2 hover:bg-black/5 rounded-full transition ${
              isBookmarked ? 'text-red-500' : ''
            }`}
            title="添加/取消书签"
          >
            <Bookmark size={20} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        )}

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="p-2 hover:bg-black/5 rounded-full transition"
            title="全屏 (F11)"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        )}

        <button
          onClick={onToggleSettings}
          className={`p-2 hover:bg-black/5 rounded-full transition ${
            isSettingsOpen ? 'bg-black/5 text-blue-500' : ''
          }`}
          title="阅读设置"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  )
}
import { useState } from 'react'
import { Bookmark, Trash2, Search } from 'lucide-react'

export type SidebarTab = 'TOC' | 'BOOKMARK' | 'SEARCH'

export interface TocItem {
  id: string
  label: string
  href?: string
  subitems?: TocItem[]
}

export interface SearchResult {
  id: string
  label: string
  excerpt: string
  location?: string
}

interface ReaderSidebarProps {
  isOpen: boolean
  activeTab: SidebarTab
  isDark: boolean
  toc: TocItem[]
  bookmarks: { id: string; label: string; text: string; location: string; time: number }[]
  searchQuery: string
  searchResults: SearchResult[]
  isSearching: boolean
  onTabChange: (tab: SidebarTab) => void
  onTocClick: (item: TocItem) => void
  onBookmarkClick: (bookmark: { id: string; location: string }) => void
  onRemoveBookmark: (id: string) => void
  onSearchChange: (query: string) => void
  onSearch: () => void
  onSearchResultClick: (result: SearchResult) => void
  onClose: () => void
}

export function ReaderSidebar({
  isOpen,
  activeTab,
  isDark,
  toc,
  bookmarks,
  searchQuery,
  searchResults,
  isSearching,
  onTabChange,
  onTocClick,
  onBookmarkClick,
  onRemoveBookmark,
  onSearchChange,
  onSearch,
  onSearchResultClick,
  onClose,
}: ReaderSidebarProps) {
  const renderToc = (items: TocItem[], depth = 0) => {
    return items.map((item, index) => (
      <div key={`${item.id}-${index}`}>
        <button
          className={`w-full text-left py-2 px-4 hover:bg-black/5 transition text-sm ${
            depth > 0 ? 'opacity-80' : 'font-medium'
          }`}
          style={{ paddingLeft: `${depth * 1 + 1}rem` }}
          onClick={() => onTocClick(item)}
        >
          {item.label}
        </button>
        {item.subitems && item.subitems.length > 0 && renderToc(item.subitems, depth + 1)}
      </div>
    ))
  }

  return (
    <>
      <div
        className={`absolute lg:relative z-40 h-full w-72 lg:w-80 shadow-2xl lg:shadow-none border-r transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:-translate-x-full lg:hidden'
        } ${isDark ? 'bg-[#222222] border-gray-800' : 'bg-[#FAF9F8] border-gray-200'}`}
      >
        <div className={`flex text-sm text-center border-b font-medium ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => onTabChange('TOC')}
            className={`flex-1 py-3 transition ${
              activeTab === 'TOC'
                ? isDark
                  ? 'text-white border-b-2 border-white'
                  : 'text-black border-b-2 border-black'
                : 'opacity-50'
            }`}
          >
            目录
          </button>
          <button
            onClick={() => onTabChange('BOOKMARK')}
            className={`flex-1 py-3 transition flex justify-center items-center gap-1 ${
              activeTab === 'BOOKMARK'
                ? isDark
                  ? 'text-white border-b-2 border-white'
                  : 'text-black border-b-2 border-black'
                : 'opacity-50'
            }`}
          >
            书签({bookmarks.length})
          </button>
          <button
            onClick={() => onTabChange('SEARCH')}
            className={`flex-1 py-3 transition ${
              activeTab === 'SEARCH'
                ? isDark
                  ? 'text-white border-b-2 border-white'
                  : 'text-black border-b-2 border-black'
                : 'opacity-50'
            }`}
          >
            搜索
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400">
          {activeTab === 'TOC' && (
            <div className="py-2">
              {toc.length > 0 ? (
                renderToc(toc)
              ) : (
                <p className="p-4 text-sm opacity-50 text-center">暂无目录数据</p>
              )}
            </div>
          )}

          {activeTab === 'BOOKMARK' && (
            <div className="p-4 flex flex-col gap-3">
              {bookmarks.length === 0 ? (
                <p className="text-sm opacity-50 text-center mt-10">暂无书签，点击右上角保存</p>
              ) : (
                bookmarks
                  .sort((a, b) => b.time - a.time)
                  .map((bm) => (
                    <div
                      key={bm.id}
                      className={`p-3 rounded-lg border group relative ${
                        isDark ? 'bg-[#333] border-gray-700' : 'bg-white border-gray-200 shadow-sm'
                      }`}
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => onBookmarkClick({ id: bm.id, location: bm.location })}
                      >
                        <p className="text-xs opacity-70 mb-1">
                          {bm.label} • {new Date(bm.time).toLocaleDateString()}
                        </p>
                        <p className="text-sm line-clamp-3">{bm.text}</p>
                      </div>
                      <button
                        onClick={() => onRemoveBookmark(bm.id)}
                        className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
              )}
            </div>
          )}

          {activeTab === 'SEARCH' && (
            <div className="p-4 flex flex-col h-full">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                  placeholder="输入关键词..."
                  className={`flex-1 w-full p-2 text-sm rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDark ? 'bg-[#333] border-gray-700' : 'bg-white border-gray-300'
                  }`}
                />
                <button
                  onClick={onSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className={`px-3 rounded text-white flex items-center justify-center transition ${
                    isSearching ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  <Search size={16} />
                </button>
              </div>

              <div className="flex-1">
                {isSearching ? (
                  <p className="text-sm opacity-60 text-center mt-10">检索中，请稍候...</p>
                ) : searchResults.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs opacity-60 mb-2">找到 {searchResults.length} 条结果</p>
                    {searchResults.map((res, idx) => (
                      <div
                        key={idx}
                        onClick={() => onSearchResultClick(res)}
                        className={`p-2 rounded cursor-pointer transition ${
                          isDark ? 'hover:bg-[#333]' : 'hover:bg-black/5'
                        }`}
                      >
                        <p className="text-sm opacity-90 line-clamp-3">{res.excerpt}</p>
                      </div>
                    ))}
                  </div>
                ) : searchQuery && !isSearching ? (
                  <p className="text-sm opacity-60 text-center mt-10">未找到相关结果</p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          className="absolute inset-0 bg-black/20 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  )
}
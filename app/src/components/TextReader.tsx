import { useState, useEffect, useCallback, useRef } from 'react'
import type { Book } from '../types'
import { useBookStore } from '../store/bookStore'
import { parseTxtFile, splitIntoPages, calculateProgress } from '../utils/txtParser'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Menu,
  Bookmark,
  Settings,
  Search,
  X,
} from 'lucide-react'

interface TextReaderProps {
  book: Book
  onBack: () => void
}

type Theme = 'light' | 'sepia' | 'dark'

const THEMES: Record<Theme, { bg: string; text: string }> = {
  light: { bg: '#ffffff', text: '#333333' },
  sepia: { bg: '#fdf6e3', text: '#433422' },
  dark: { bg: '#1e1e1e', text: '#cccccc' },
}

const FONTS = [
  { name: '系统默认', value: 'system-ui, sans-serif' },
  { name: '宋体', value: 'SimSun, serif' },
  { name: '黑体', value: 'SimHei, sans-serif' },
  { name: '楷体', value: 'KaiTi, serif' },
]

export function TextReader({ book, onBack }: TextReaderProps) {
  const { updateTXTProgress } = useBookStore()

  const [pages, setPages] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ page: number; preview: string }[]>([])
  const [theme, setTheme] = useState<Theme>('sepia')
  const [fontSize, setFontSize] = useState(100)
  const [lineHeight, setLineHeight] = useState(1.8)
  const [fontFamily, setFontFamily] = useState(FONTS[0].value)
  const [bookmarks, setBookmarks] = useState<{ page: number; text: string; time: number }[]>([])
  const [isIdle, setIsIdle] = useState(false)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadBook = async () => {
      try {
        const fileBuffer = await window.electronAPI.readFile(book.filePath)
        if (!fileBuffer) {
          alert('无法读取文件')
          return
        }

        const arrayBuffer = fileBuffer.buffer.slice(
          fileBuffer.byteOffset,
          fileBuffer.byteOffset + fileBuffer.byteLength
        ) as ArrayBuffer
        const uint8Array = new Uint8Array(arrayBuffer)
        const fakeFile = new File([uint8Array], book.title + '.txt', {
          type: 'text/plain',
        })
        const txtBook = await parseTxtFile(fakeFile, book.filePath)
        const pageList = splitIntoPages(txtBook.content)

        setPages(pageList)

        const savedProgress = book.txtProgress
        if (savedProgress && savedProgress.currentPage > 0) {
          setCurrentPage(Math.min(savedProgress.currentPage, pageList.length - 1))
        }

        if (book.bookmarks) {
          setBookmarks(
            book.bookmarks.map((b) => ({
              page: parseInt(b.label.replace('第', '').replace('页', '')) || 0,
              text: b.text,
              time: b.time,
            }))
          )
        }
      } catch (e) {
        console.error('加载失败:', e)
        alert('加载书籍失败')
      }
    }

    loadBook()
  }, [book.filePath, book.title, book.txtProgress, book.bookmarks])

  const saveProgress = useCallback(
    (page: number) => {
      const characterOffset = pages.slice(0, page).join('\n').length
      updateTXTProgress(book.id, { currentPage: page, characterOffset })
    },
    [book.id, pages, updateTXTProgress]
  )

  const goToPage = useCallback(
    (page: number) => {
      if (page < 0 || page >= pages.length) return
      setCurrentPage(page)
      saveProgress(page)
    },
    [pages.length, saveProgress]
  )

  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage])
  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          prevPage()
          break
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault()
          nextPage()
          break
        case 'Escape':
          if (showSidebar || showSettings || showSearch) {
            setShowSidebar(false)
            setShowSettings(false)
            setShowSearch(false)
          } else {
            onBack()
          }
          break
      }
    },
    [prevPage, nextPage, onBack, showSidebar, showSettings, showSearch]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const resetIdleTimer = useCallback(() => {
    setIsIdle(false)
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true)
    }, 3000)
  }, [])

  useEffect(() => {
    resetIdleTimer()
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [resetIdleTimer])

  useEffect(() => {
    const handleMouseMove = () => resetIdleTimer()
    const handleClick = () => resetIdleTimer()
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
    }
  }, [resetIdleTimer])

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const results: { page: number; preview: string }[] = []
    const query = searchQuery.toLowerCase()

    pages.forEach((page, index) => {
      const lowerPage = page.toLowerCase()
      if (lowerPage.includes(query)) {
        const maxLen = 50
        const start = Math.max(0, lowerPage.indexOf(query) - maxLen / 2)
        const end = Math.min(page.length, start + maxLen)
        const preview = (start > 0 ? '...' : '') + page.slice(start, end) + (end < page.length ? '...' : '')

        results.push({ page: index, preview })
      }
    })

    setSearchResults(results)
  }, [searchQuery, pages])

  useEffect(() => {
    handleSearch()
  }, [searchQuery, handleSearch])

  const addBookmark = useCallback(() => {
    const newBookmark = {
      page: currentPage,
      text: pages[currentPage]?.slice(0, 50) || '',
      time: Date.now(),
    }
    setBookmarks((prev) => [...prev, newBookmark])
  }, [currentPage, pages])

  const currentTheme = THEMES[theme]
  const progress = calculateProgress(currentPage + 1, pages.length)

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}
    >
      <div
        className={`flex items-center justify-between px-4 py-3 border-b transition-opacity ${
          isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ borderColor: theme === 'dark' ? '#333' : '#ddd' }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 hover:opacity-70 transition"
        >
          <ArrowLeft size={20} />
          <span>返回</span>
        </button>

        <div className="flex items-center gap-4">
          <span className="text-sm opacity-70">
            {currentPage + 1} / {pages.length}
          </span>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 hover:opacity-70 transition"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:opacity-70 transition"
          >
            <Menu size={20} />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:opacity-70 transition"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {showSearch && (
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: theme === 'dark' ? '#333' : '#ddd', backgroundColor: currentTheme.bg }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索内容..."
              className="flex-1 px-3 py-2 rounded border"
              style={{
                backgroundColor: 'transparent',
                borderColor: theme === 'dark' ? '#444' : '#ddd',
                color: currentTheme.text,
              }}
            />
            <button
              onClick={() => setShowSearch(false)}
              className="p-2 hover:opacity-70"
            >
              <X size={20} />
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto space-y-2">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => {
                    goToPage(result.page)
                    setShowSearch(false)
                  }}
                  className="w-full text-left p-2 rounded hover:opacity-70 transition"
                  style={{ backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f0f0f0' }}
                >
                  <div className="text-sm font-medium">
                    第 {result.page + 1} 页
                  </div>
                  <div className="text-sm opacity-70 truncate">{result.preview}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div
          ref={viewerRef}
          className="flex-1 overflow-y-auto px-8 py-6 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const clickX = e.clientX - rect.left
            if (clickX < rect.width / 3) {
              prevPage()
            } else if (clickX > (rect.width * 2) / 3) {
              nextPage()
            }
          }}
        >
          <div
            className="max-w-2xl mx-auto whitespace-pre-wrap leading-relaxed"
            style={{
              fontSize: `${fontSize}%`,
              lineHeight: lineHeight,
              fontFamily: fontFamily,
            }}
          >
            {pages[currentPage] || '加载中...'}
          </div>
        </div>

        {showSidebar && (
          <div
            className="w-72 border-l overflow-y-auto"
            style={{
              borderColor: theme === 'dark' ? '#333' : '#ddd',
              backgroundColor: currentTheme.bg,
            }}
          >
            <div className="p-4">
              <h3 className="font-bold mb-4">书签</h3>
              <button
                onClick={addBookmark}
                className="w-full flex items-center gap-2 px-3 py-2 rounded mb-4 hover:opacity-80 transition"
                style={{ backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0' }}
              >
                <Bookmark size={16} />
                <span>添加书签</span>
              </button>

              {bookmarks.length === 0 ? (
                <p className="text-sm opacity-50">暂无书签</p>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((bm, index) => (
                    <button
                      key={index}
                      onClick={() => goToPage(bm.page)}
                      className="w-full text-left p-2 rounded hover:opacity-70 transition"
                      style={{ backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f0f0f0' }}
                    >
                      <div className="text-sm font-medium">第 {bm.page + 1} 页</div>
                      <div className="text-xs opacity-60 truncate">{bm.text}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {showSettings && (
          <div
            className="w-72 border-l p-4 space-y-4 overflow-y-auto"
            style={{
              borderColor: theme === 'dark' ? '#333' : '#ddd',
              backgroundColor: currentTheme.bg,
            }}
          >
            <h3 className="font-bold">阅读设置</h3>

            <div>
              <label className="block text-sm mb-2">主题</label>
              <div className="flex gap-2">
                {(['light', 'sepia', 'dark'] as Theme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-3 py-1 rounded text-sm ${
                      theme === t ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{
                      backgroundColor:
                        t === 'light' ? '#fff' : t === 'sepia' ? '#fdf6e3' : '#1e1e1e',
                      color: t === 'light' ? '#333' : t === 'sepia' ? '#433422' : '#ccc',
                      border: '1px solid #ddd',
                    }}
                  >
                    {t === 'light' ? '浅色' : t === 'sepia' ? '护眼' : '夜间'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2">字号: {fontSize}%</label>
              <input
                type="range"
                min="50"
                max="200"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">行距: {lineHeight}</label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={lineHeight}
                onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">字体</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full px-3 py-2 rounded border"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: theme === 'dark' ? '#444' : '#ddd',
                  color: currentTheme.text,
                }}
              >
                {FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div
        className={`flex items-center justify-between px-4 py-2 border-t transition-opacity ${
          isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ borderColor: theme === 'dark' ? '#333' : '#ddd' }}
      >
        <button
          onClick={prevPage}
          disabled={currentPage === 0}
          className="p-2 hover:opacity-70 disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2 flex-1 mx-4">
          <div
            className="h-1 flex-1 rounded-full overflow-hidden"
            style={{ backgroundColor: theme === 'dark' ? '#333' : '#ddd' }}
          >
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <span className="text-sm opacity-70">{progress}%</span>

        <button
          onClick={nextPage}
          disabled={currentPage >= pages.length - 1}
          className="p-2 hover:opacity-70 disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}

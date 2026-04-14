import { useState, useEffect, useCallback, useRef } from 'react'
import type { Book } from '../types'
import { useBookStore } from '../store/bookStore'
import { useIdle, useReaderSettings } from '../hooks'
import { parseTxtFile, splitIntoPages } from '../utils/txtParser'
import {
  ReaderHeader,
  ReaderSidebar,
  ReaderSettingsPanel,
  ReaderProgress,
  type SidebarTab,
  type SearchResult,
} from '../components/ReaderComponents'

interface TextReaderProps {
  book: Book
  onBack: () => void
}

export function TextReader({ book, onBack }: TextReaderProps) {
  const { updateTXTProgress, addBookmark: addBookmarkStore, removeBookmark: removeBookmarkStore } = useBookStore()

  const [pages, setPages] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('BOOKMARK')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [bookmarks, setBookmarks] = useState<{ id: string; label: string; text: string; location: string; time: number }[]>([])
  const viewerRef = useRef<HTMLDivElement>(null)

  const { isIdle } = useIdle({ timeout: 3000 })
  const { settings, setTheme, setFontSize, setLineHeight, setFontFamily, getThemeColors, fonts } = useReaderSettings()

  const themeColors = getThemeColors()
  const isDark = settings.theme === 'dark'

  const currentLocation = `page-${currentPage}`
  const isBookmarked = bookmarks.some((b) => b.location === currentLocation)

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

        if (book.bookmarks) {
          setBookmarks(
            book.bookmarks.map((b) => ({
              id: b.cfi,
              label: b.label,
              text: b.text,
              location: b.cfi,
              time: b.time,
            }))
          )
        }

        const savedProgress = book.txtProgress
        if (savedProgress && savedProgress.currentPage > 0) {
          setCurrentPage(Math.min(savedProgress.currentPage, pageList.length - 1))
        }
      } catch (e) {
        console.error('加载失败:', e)
        alert('加载书籍失败')
      }
    }

    loadBook()
  }, [book.filePath, book.title])

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

  const handleTocClick = useCallback(() => {}, [])

  const handleBookmarkClick = useCallback(
    (bookmark: { id: string; location: string }) => {
      const page = parseInt(bookmark.location.replace('page-', '')) || 0
      goToPage(page)
    },
    [goToPage]
  )

  const handleRemoveBookmark = useCallback(
    (id: string) => {
      const bookmark = bookmarks.find((b) => b.id === id)
      if (bookmark) {
        setBookmarks((prev) => prev.filter((b) => b.id !== id))
        removeBookmarkStore(book.id, bookmark.location)
      }
    },
    [book.id, bookmarks, removeBookmarkStore]
  )

  const handleToggleBookmark = useCallback(() => {
    const location = `page-${currentPage}`
    const existingBookmark = bookmarks.find((b) => b.location === location)

    if (existingBookmark) {
      setBookmarks((prev) => prev.filter((b) => b.id !== existingBookmark.id))
      removeBookmarkStore(book.id, location)
    } else {
      const text = pages[currentPage]?.slice(0, 50) || ''
      const newBookmark = {
        id: `${Date.now()}`,
        label: `第 ${currentPage + 1} 页`,
        text: text,
        location: location,
        time: Date.now(),
      }
      setBookmarks((prev) => [...prev, newBookmark])
      addBookmarkStore(book.id, {
        cfi: location,
        label: newBookmark.label,
        text: text,
        time: newBookmark.time,
      })
    }
  }, [currentPage, bookmarks, pages, book.id, addBookmarkStore, removeBookmarkStore])

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const results: SearchResult[] = []
    const query = searchQuery.toLowerCase()

    pages.forEach((page, index) => {
      const lowerPage = page.toLowerCase()
      if (lowerPage.includes(query)) {
        const maxLen = 60
        const start = Math.max(0, lowerPage.indexOf(query) - maxLen / 2)
        const end = Math.min(page.length, start + maxLen)
        const excerpt = (start > 0 ? '...' : '') + page.slice(start, end) + (end < page.length ? '...' : '')

        results.push({
          id: `search-${index}`,
          label: `第 ${index + 1} 页`,
          excerpt,
          location: `page-${index}`,
        })
      }
    })

    setSearchResults(results)
  }, [searchQuery, pages])

  useEffect(() => {
    handleSearch()
  }, [searchQuery, handleSearch])

  const handleSearchResultClick = useCallback(
    (result: SearchResult) => {
      if (result.location) {
        const page = parseInt(result.location.replace('page-', '')) || 0
        goToPage(page)
      }
    },
    [goToPage]
  )

  const handleProgressChange = useCallback(
    (val: number) => {
      const page = Math.round((val / 100) * (pages.length - 1))
      goToPage(page)
    },
    [pages.length, goToPage]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          goToPage(currentPage - 1)
          break
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault()
          goToPage(currentPage + 1)
          break
        case 'Escape':
          onBack()
          break
      }
    },
    [currentPage, goToPage, onBack]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const progress = pages.length > 0 ? ((currentPage + 1) / pages.length) * 100 : 0

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ backgroundColor: themeColors.bg, color: themeColors.text }}
    >
      <ReaderHeader
        title={book.title}
        isIdle={isIdle}
        isSidebarOpen={isSidebarOpen}
        isSettingsOpen={isSettingsOpen}
        progress={progress}
        isDark={isDark}
        isBookmarked={isBookmarked}
        onBack={onBack}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
        onToggleSearch={() => {
          setSidebarTab('SEARCH')
          setIsSidebarOpen(true)
        }}
        onToggleBookmark={handleToggleBookmark}
        isSearchOpen={sidebarTab === 'SEARCH' && isSidebarOpen}
      />

      <ReaderSettingsPanel
        isOpen={isSettingsOpen}
        isDark={isDark}
        settings={settings}
        fonts={fonts}
        onThemeChange={setTheme}
        onFontSizeChange={setFontSize}
        onLineHeightChange={setLineHeight}
        onFontFamilyChange={setFontFamily}
        onClose={() => setIsSettingsOpen(false)}
      />

      <div className="flex-1 flex overflow-hidden pt-14 pb-12">
        <ReaderSidebar
          isOpen={isSidebarOpen}
          activeTab={sidebarTab}
          isDark={isDark}
          toc={[]}
          bookmarks={bookmarks}
          searchQuery={searchQuery}
          searchResults={searchResults}
          isSearching={isSearching}
          onTabChange={setSidebarTab}
          onTocClick={handleTocClick}
          onBookmarkClick={handleBookmarkClick}
          onRemoveBookmark={handleRemoveBookmark}
          onSearchChange={setSearchQuery}
          onSearch={handleSearch}
          onSearchResultClick={handleSearchResultClick}
          onClose={() => setIsSidebarOpen(false)}
        />

        <div
          ref={viewerRef}
          className="flex-1 overflow-y-auto px-8 py-6 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const clickX = e.clientX - rect.left
            if (clickX < rect.width / 3) {
              goToPage(currentPage - 1)
            } else if (clickX > (rect.width * 2) / 3) {
              goToPage(currentPage + 1)
            }
          }}
        >
          <div
            className="max-w-2xl mx-auto whitespace-pre-wrap leading-relaxed"
            style={{
              fontSize: `${settings.fontSize}%`,
              lineHeight: settings.lineHeight,
              fontFamily: settings.fontFamily,
            }}
          >
            {pages[currentPage] || '加载中...'}
          </div>
        </div>
      </div>

      <ReaderProgress
        progress={progress}
        isIdle={isIdle}
        isDark={isDark}
        isLocationsReady={true}
        onProgressChange={handleProgressChange}
      />
    </div>
  )
}
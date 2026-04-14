import { useEffect, useRef, useState, useCallback } from 'react'
import ePub, { Book as EPubBook, Rendition } from 'epubjs'
import type { Book } from '../types'
import { useBookStore } from '../store/bookStore'
import { useIdle, useReaderSettings } from '../hooks'
import {
  ReaderHeader,
  ReaderSidebar,
  ReaderSettingsPanel,
  ReaderProgress,
  type SidebarTab,
  type TocItem,
  type SearchResult,
} from '../components/ReaderComponents'

interface ReaderProps {
  book: Book
  onBack: () => void
}

interface NavItem {
  id: string
  href: string
  label: string
  subitems?: NavItem[]
}

export function Reader({ book: initialBook, onBack }: ReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<EPubBook | null>(null)
  const renditionRef = useRef<Rendition | null>(null)

  const updateBookProgressStore = useBookStore((state) => state.updateBookProgress)
  const addBookmarkStore = useBookStore((state) => state.addBookmark)
  const removeBookmarkStore = useBookStore((state) => state.removeBookmark)
  const currentBook = useBookStore((state) => state.books.find((b) => b.id === initialBook.id)) || initialBook

  const { isIdle } = useIdle({ timeout: 3000 })
  const { settings, setTheme, setFontSize, setLineHeight, setFontFamily, getThemeColors, fonts } = useReaderSettings()

  const [toc, setToc] = useState<TocItem[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('TOC')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isLocationsReady, setIsLocationsReady] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [bookmarks, setBookmarks] = useState<{ id: string; label: string; text: string; location: string; time: number }[]>([])
  const [currentLocation, setCurrentLocation] = useState('')

  const themeColors = getThemeColors()
  const isDark = settings.theme === 'dark'
  const isBookmarked = bookmarks.some((b) => b.location === currentLocation)

  useEffect(() => {
    let isMounted = true

    const initBook = async () => {
      try {
        const fileBuffer = await window.electronAPI.readFile(currentBook.filePath)
        if (!fileBuffer || !isMounted) return

        const arrayBuffer = fileBuffer.buffer.slice(
          fileBuffer.byteOffset,
          fileBuffer.byteOffset + fileBuffer.byteLength
        )

        const epubBook = ePub(arrayBuffer as ArrayBuffer)
        bookRef.current = epubBook

        await epubBook.ready

        if (currentBook.bookmarks) {
          setBookmarks(
            currentBook.bookmarks.map((b) => ({
              id: b.cfi,
              label: b.label,
              text: b.text,
              location: b.cfi,
              time: b.time,
            }))
          )
        }

        epubBook.locations.generate(1600).then(() => {
          if (isMounted) setIsLocationsReady(true)
        }).catch((err) => console.error('Error generating locations:', err))

        if (viewerRef.current) {
          const rendition = epubBook.renderTo(viewerRef.current, {
            width: '100%',
            height: '100%',
            spread: 'none',
            allowScriptedContent: true,
          })
          renditionRef.current = rendition

          rendition.themes.register('light', { body: { background: '#ffffff', color: '#333333' } })
          rendition.themes.register('sepia', { body: { background: '#fdf6e3', color: '#433422' } })
          rendition.themes.register('dark', { body: { background: '#1e1e1e', color: '#cccccc' } })
          rendition.themes.select(settings.theme)
          rendition.themes.fontSize(settings.fontSize + '%')
          rendition.themes.override('line-height', settings.lineHeight.toString())
          rendition.themes.override('font-family', settings.fontFamily)

          if (currentBook.lastReadCfi) {
            await rendition.display(currentBook.lastReadCfi)
          } else {
            await rendition.display()
          }

          rendition.on('relocated', (location: any) => {
            if (!isMounted) return
            setCurrentLocation(location.start.cfi)
            updateBookProgressStore(currentBook.id, location.start.cfi)

            if (epubBook.locations.length() > 0) {
              const pct = epubBook.locations.percentageFromCfi(location.start.cfi)
              setProgress(pct * 100)
            }
          })

          epubBook.loaded.navigation.then((nav) => {
            if (isMounted) {
              const transformToc = (items: NavItem[]): TocItem[] =>
                items.map((item) => ({
                  id: item.id,
                  label: item.label,
                  href: item.href,
                  subitems: item.subitems ? transformToc(item.subitems) : undefined,
                }))
              setToc(transformToc(nav.toc as NavItem[]))
            }
          })
        }
      } catch (e) {
        console.error('Reader init error:', e)
      }
    }

    initBook()

    return () => {
      isMounted = false
      if (bookRef.current) {
        bookRef.current.destroy()
      }
    }
  }, [currentBook.filePath])

  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.select(settings.theme)
      renditionRef.current.themes.fontSize(settings.fontSize + '%')
      renditionRef.current.themes.override('line-height', settings.lineHeight.toString())
      renditionRef.current.themes.override('font-family', settings.fontFamily)
    }
  }, [settings])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.error(err))
    } else {
      document.exitFullscreen()
    }
  }, [])

  const handleTocClick = useCallback((item: TocItem) => {
    if (item.href) {
      renditionRef.current?.display(item.href)
    }
  }, [])

  const handleBookmarkClick = useCallback((bookmark: { id: string; location: string }) => {
    renditionRef.current?.display(bookmark.location)
  }, [])

  const handleRemoveBookmark = useCallback((id: string) => {
    const bookmark = bookmarks.find((b) => b.id === id)
    if (bookmark) {
      setBookmarks((prev) => prev.filter((b) => b.id !== id))
      removeBookmarkStore(currentBook.id, bookmark.location)
    }
  }, [bookmarks, currentBook.id, removeBookmarkStore])

  const handleToggleBookmark = useCallback(async () => {
    if (!currentLocation) return

    const existingBookmark = bookmarks.find((b) => b.location === currentLocation)
    if (existingBookmark) {
      setBookmarks((prev) => prev.filter((b) => b.id !== existingBookmark.id))
      removeBookmarkStore(currentBook.id, currentLocation)
    } else {
      let text = '书签 ' + new Date().toLocaleTimeString()
      try {
        if (bookRef.current) {
          const currentRange = await bookRef.current.getRange(currentLocation)
          if (currentRange) text = currentRange.toString().trim().slice(0, 40) + '...'
        }
      } catch (e) {
        console.error('Failed to extract text for bookmark', e)
      }
      const newBookmark = {
        id: `${Date.now()}`,
        label: `进度: ${progress.toFixed(1)}%`,
        text: text,
        location: currentLocation,
        time: Date.now(),
      }
      setBookmarks((prev) => [...prev, newBookmark])
      addBookmarkStore(currentBook.id, {
        cfi: currentLocation,
        label: newBookmark.label,
        text: text,
        time: newBookmark.time,
      })
    }
  }, [currentLocation, bookmarks, currentBook.id, progress, addBookmarkStore, removeBookmarkStore])

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim()
    if (!q || !bookRef.current) return
    setIsSearching(true)
    setSearchResults([])

    try {
      const book = bookRef.current
      const spineItems = (book.spine as any).spineItems || []
      const searchTasks = spineItems.map((item: any) =>
        item
          .load(book.load.bind(book))
          .then(() => item.find(q))
          .finally(() => item.unload())
      )

      const resultsArray = await Promise.all(searchTasks)
      const flatResults = resultsArray.flat().filter(Boolean)
      setSearchResults(
        flatResults.map((res: any, idx: number) => ({
          id: `search-${idx}`,
          label: res.cfi || '',
          excerpt: res.excerpt || '',
          location: res.cfi,
        }))
      )
    } catch (e) {
      console.error('Search failed:', e)
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery])

  const handleSearchResultClick = useCallback((result: SearchResult) => {
    if (result.location) {
      renditionRef.current?.display(result.location)
    }
  }, [])

  const handleProgressChange = useCallback((val: number) => {
    setProgress(val)
    const cfi = bookRef.current?.locations.cfiFromPercentage(val / 100)
    if (cfi) renditionRef.current?.display(cfi)
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          renditionRef.current?.prev()
          break
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault()
          renditionRef.current?.next()
          break
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen()
          } else {
            onBack()
          }
          break
        case 'F11':
          e.preventDefault()
          toggleFullscreen()
          break
      }
    },
    [onBack, toggleFullscreen]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const containerBg =
    settings.theme === 'light' ? 'bg-white' : settings.theme === 'sepia' ? 'bg-[#FDF6E3]' : 'bg-[#18181A]'

  return (
    <div
      className={`flex flex-col h-screen overflow-hidden transition-colors duration-300 ${containerBg} ${
        isDark ? ' text-white' : ' text-black'
      }`}
    >
      <ReaderHeader
        title={currentBook.title}
        isIdle={isIdle}
        isSidebarOpen={isSidebarOpen}
        isSettingsOpen={isSettingsOpen}
        progress={progress}
        isFullscreen={isFullscreen}
        isDark={isDark}
        isBookmarked={isBookmarked}
        onBack={onBack}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
        onToggleFullscreen={toggleFullscreen}
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

      <div className="flex-1 flex overflow-hidden relative pt-14 pb-12">
        <ReaderSidebar
          isOpen={isSidebarOpen}
          activeTab={sidebarTab}
          isDark={isDark}
          toc={toc}
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

        <div className="flex-1 relative flex items-center justify-center">
          <div className="absolute inset-y-4 inset-x-12 md:inset-x-20 lg:inset-x-24" ref={viewerRef}></div>
        </div>
      </div>

      <ReaderProgress
        progress={progress}
        isIdle={isIdle}
        isDark={isDark}
        isLocationsReady={isLocationsReady}
        onProgressChange={handleProgressChange}
      />
    </div>
  )
}
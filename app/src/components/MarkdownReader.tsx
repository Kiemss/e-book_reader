import { useState, useEffect, useCallback, useRef } from 'react'
import type { Book } from '../types'
import { useBookStore } from '../store/bookStore'
import { useIdle, useReaderSettings } from '../hooks'
import { parseMdFile, calculateProgress, type TocItem } from '../utils/mdParser'
import {
  ReaderHeader,
  ReaderSidebar,
  ReaderSettingsPanel,
  ReaderProgress,
  type SidebarTab,
  type SearchResult,
} from '../components/ReaderComponents'

interface MarkdownReaderProps {
  book: Book
  onBack: () => void
}

export function MarkdownReader({ book, onBack }: MarkdownReaderProps) {
  const { updateTXTProgress, addBookmark: addBookmarkStore, removeBookmark: removeBookmarkStore } = useBookStore()

  const [html, setHtml] = useState('')
  const [toc, setToc] = useState<TocItem[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('TOC')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeHeadingId, setActiveHeadingId] = useState<string>('')
  const [bookmarks, setBookmarks] = useState<{ id: string; label: string; text: string; location: string; time: number }[]>([])
  const contentRef = useRef<HTMLDivElement>(null)
  const headingOffsetsRef = useRef<Map<string, number>>(new Map())

  const { isIdle } = useIdle({ timeout: 3000 })
  const { settings, setTheme, setFontSize, setLineHeight, setFontFamily, getThemeColors, fonts } = useReaderSettings()

  const themeColors = getThemeColors()
  const isDark = settings.theme === 'dark'

  const currentLocation = activeHeadingId
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
        const fakeFile = new File([uint8Array], book.title + '.md', {
          type: 'text/markdown',
        })
        const mdBook = await parseMdFile(fakeFile)

        setHtml(mdBook.html)
        setToc(mdBook.toc)

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
        if (savedProgress && savedProgress.characterOffset > 0) {
          requestAnimationFrame(() => {
            if (contentRef.current) {
              contentRef.current.scrollTop = savedProgress.characterOffset
            }
          })
        }
      } catch (e) {
        console.error('加载失败:', e)
        alert('加载书籍失败')
      }
    }

    loadBook()
  }, [book.filePath, book.title])

  useEffect(() => {
    if (!html || !contentRef.current) return

    const calculateOffsets = () => {
      const offsets = new Map<string, number>()
      const headings = contentRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6')
      if (headings) {
        headings.forEach((heading) => {
          const id = heading.id
          if (id) {
            offsets.set(id, heading.getBoundingClientRect().top + contentRef.current!.scrollTop)
          }
        })
      }
      headingOffsetsRef.current = offsets
    }

    requestAnimationFrame(calculateOffsets)
  }, [html])

  const saveProgress = useCallback(
    (progress: number) => {
      if (!contentRef.current) return
      const scrollTop = contentRef.current.scrollTop
      updateTXTProgress(book.id, {
        currentPage: Math.round(progress),
        characterOffset: scrollTop,
      })
    },
    [book.id, updateTXTProgress]
  )

  const handleScroll = useCallback(() => {
    if (!contentRef.current) return

    const { scrollTop, scrollHeight } = contentRef.current
    const progress = calculateProgress(scrollTop, scrollHeight)
    saveProgress(progress)

    const offsets = headingOffsetsRef.current
    let currentId = ''
    for (const [id, offset] of offsets) {
      if (scrollTop >= offset - 100) {
        currentId = id
      }
    }
    if (currentId && currentId !== activeHeadingId) {
      setActiveHeadingId(currentId)
    }
  }, [saveProgress, activeHeadingId])

  const scrollToHeading = useCallback((id: string) => {
    const element = document.getElementById(id)
    if (element && contentRef.current) {
      const offset = element.getBoundingClientRect().top + contentRef.current.scrollTop - 20
      contentRef.current.scrollTo({
        top: offset,
        behavior: 'smooth',
      })
    }
  }, [])

  const handleTocClick = useCallback(
    (item: { id: string }) => {
      scrollToHeading(item.id)
    },
    [scrollToHeading]
  )

  const handleBookmarkClick = useCallback(
    (bookmark: { id: string; location: string }) => {
      scrollToHeading(bookmark.location)
    },
    [scrollToHeading]
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
    if (!currentLocation) return

    const existingBookmark = bookmarks.find((b) => b.location === currentLocation)
    if (existingBookmark) {
      setBookmarks((prev) => prev.filter((b) => b.id !== existingBookmark.id))
      removeBookmarkStore(book.id, currentLocation)
    } else {
      const heading = document.getElementById(currentLocation)
      const text = heading?.textContent?.slice(0, 50) || currentLocation
      const newBookmark = {
        id: `${Date.now()}`,
        label: text,
        text: text,
        location: currentLocation,
        time: Date.now(),
      }
      setBookmarks((prev) => [...prev, newBookmark])
      addBookmarkStore(book.id, {
        cfi: currentLocation,
        label: text,
        text: text,
        time: newBookmark.time,
      })
    }
  }, [currentLocation, bookmarks, book.id, addBookmarkStore, removeBookmarkStore])

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim() || !contentRef.current) {
      setSearchResults([])
      return
    }

    const results: SearchResult[] = []
    const query = searchQuery.toLowerCase()

    const walker = document.createTreeWalker(contentRef.current, NodeFilter.SHOW_TEXT, null)

    const textNodes: Text[] = []
    let node: Text | null
    while ((node = walker.nextNode() as Text | null)) {
      if (node.textContent && node.textContent.toLowerCase().includes(query)) {
        textNodes.push(node)
      }
    }

    const seenHeadings = new Set<string>()
    textNodes.forEach((textNode) => {
      let parent = textNode.parentElement
      let headingId = ''
      let headingText = ''

      while (parent && parent !== contentRef.current) {
        if (/^h[1-6]$/i.test(parent.tagName)) {
          headingId = parent.id
          headingText = parent.textContent || ''
          break
        }
        parent = parent.parentElement
      }

      if (headingId && !seenHeadings.has(headingId)) {
        seenHeadings.add(headingId)
        const textContent = textNode.textContent || ''
        const lowerContent = textContent.toLowerCase()
        const index = lowerContent.indexOf(query)
        const maxLen = 60
        const start = Math.max(0, index - maxLen / 2)
        const end = Math.min(textContent.length, start + maxLen)
        const excerpt =
          (start > 0 ? '...' : '') + textContent.slice(start, end) + (end < textContent.length ? '...' : '')

        results.push({
          id: `search-${headingId}`,
          label: headingText.slice(0, 50),
          excerpt,
          location: headingId,
        })
      }
    })

    setSearchResults(results.slice(0, 20))
  }, [searchQuery])

  useEffect(() => {
    handleSearch()
  }, [searchQuery, handleSearch])

  const handleSearchResultClick = useCallback(
    (result: SearchResult) => {
      if (result.location) {
        scrollToHeading(result.location)
      }
    },
    [scrollToHeading]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      switch (e.key) {
        case 'Escape':
          onBack()
          break
        case 'ArrowUp':
          if (contentRef.current) {
            contentRef.current.scrollBy({ top: -100, behavior: 'smooth' })
          }
          break
        case 'ArrowDown':
          if (contentRef.current) {
            contentRef.current.scrollBy({ top: 100, behavior: 'smooth' })
          }
          break
      }
    },
    [onBack]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const getCurrentProgress = () => {
    if (!contentRef.current) return 0
    const { scrollTop, scrollHeight } = contentRef.current
    return calculateProgress(scrollTop, scrollHeight)
  }

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
        progress={getCurrentProgress()}
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
          toc={toc.map((item) => ({
            id: item.id,
            label: item.text,
            href: item.id,
          }))}
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
          ref={contentRef}
          className="flex-1 overflow-y-auto px-8 py-6"
          onScroll={handleScroll}
        >
          <div
            className="max-w-2xl mx-auto markdown-content"
            style={{
              fontSize: `${settings.fontSize}%`,
              lineHeight: settings.lineHeight,
              fontFamily: settings.fontFamily,
            }}
            dangerouslySetInnerHTML={{ __html: html || '加载中...' }}
          />
          <style>{`
            .markdown-content h1 { font-size: 1.8em; margin: 1em 0 0.5em; font-weight: bold; border-bottom: 1px solid ${isDark ? '#444' : '#ddd'}; padding-bottom: 0.3em; }
            .markdown-content h2 { font-size: 1.5em; margin: 0.8em 0 0.4em; font-weight: bold; border-bottom: 1px solid ${isDark ? '#444' : '#ddd'}; padding-bottom: 0.2em; }
            .markdown-content h3 { font-size: 1.2em; margin: 0.6em 0 0.3em; font-weight: bold; }
            .markdown-content h4, .markdown-content h5, .markdown-content h6 { font-size: 1em; margin: 0.5em 0; font-weight: bold; }
            .markdown-content p { margin: 0.5em 0; }
            .markdown-content code { background: ${themeColors.codeBg}; padding: 0.2em 0.4em; border-radius: 3px; font-family: Consolas, monospace; font-size: 0.9em; }
            .markdown-content pre { background: ${themeColors.codeBg}; padding: 1em; border-radius: 6px; overflow-x: auto; margin: 1em 0; }
            .markdown-content pre code { background: none; padding: 0; }
            .markdown-content blockquote { border-left: 3px solid ${isDark ? '#555' : '#ccc'}; padding-left: 1em; margin: 1em 0; color: ${isDark ? '#999' : '#666'}; }
            .markdown-content ul, .markdown-content ol { margin: 0.5em 0; padding-left: 2em; }
            .markdown-content li { margin: 0.25em 0; }
            .markdown-content a { color: #3b82f6; text-decoration: none; }
            .markdown-content a:hover { text-decoration: underline; }
            .markdown-content img { max-width: 100%; height: auto; }
            .markdown-content hr { border: none; border-top: 1px solid ${isDark ? '#444' : '#ddd'}; margin: 1em 0; }
            .markdown-content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
            .markdown-content th, .markdown-content td { border: 1px solid ${isDark ? '#444' : '#ddd'}; padding: 0.5em; }
            .markdown-content th { background: ${themeColors.codeBg}; }
            .hljs-pre { position: relative; }
          `}</style>
        </div>
      </div>

      <ReaderProgress
        progress={getCurrentProgress()}
        isIdle={isIdle}
        isDark={isDark}
        isLocationsReady={true}
      />
    </div>
  )
}
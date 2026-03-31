import { useEffect, useRef, useState } from 'react'
import ePub, { Book as EPubBook, Rendition } from 'epubjs'
import type { Book } from '../types'
import { useBookStore } from '../store/bookStore'
import { ArrowLeft, ChevronLeft, ChevronRight, Menu, Settings, Sun, Moon, Coffee, Type } from 'lucide-react'

interface ReaderProps {
  book: Book;
  onBack: () => void;
}

interface NavItem {
  id: string;
  href: string;
  label: string;
  subitems?: NavItem[];
}

const THEMES = {
  light: { background: '#ffffff', color: '#333333' },
  sepia: { background: '#fdf6e3', color: '#433422' },
  dark:  { background: '#1e1e1e', color: '#cccccc' }
}
type ThemeKey = keyof typeof THEMES;

export function Reader({ book: currentBook, onBack }: ReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<EPubBook | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const updateBookProgress = useBookStore(state => state.updateBookProgress)

  // State
  const [toc, setToc] = useState<NavItem[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [fontSize, setFontSize] = useState(100)
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>('sepia')

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

        if (viewerRef.current) {
          const rendition = epubBook.renderTo(viewerRef.current, {
            width: '100%',
            height: '100%',
            spread: 'none',
            allowScriptedContent: true
          })
          renditionRef.current = rendition

          // Register Themes
          rendition.themes.register('light', { body: THEMES.light });
          rendition.themes.register('sepia', { body: THEMES.sepia });
          rendition.themes.register('dark', { body: THEMES.dark });
          rendition.themes.select(currentTheme);
          rendition.themes.fontSize(`${fontSize}%`);

          // Move to last reading pos or start
          if (currentBook.lastReadCfi) {
            await rendition.display(currentBook.lastReadCfi)
          } else {
            await rendition.display()
          }

          // Track progress
          rendition.on('relocated', (location: any) => {
            if (isMounted) {
              updateBookProgress(currentBook.id, location.start.cfi)
            }
          })

          // Extract TOC
          epubBook.loaded.navigation.then(nav => {
            if (isMounted) {
              setToc(nav.toc as NavItem[])
            }
          })
        }

        // Key bindings for navigation
        const handleKeyUp = (e: KeyboardEvent) => {
          if (e.key === 'ArrowLeft') renditionRef.current?.prev()
          if (e.key === 'ArrowRight') renditionRef.current?.next()
        }
        document.addEventListener('keyup', handleKeyUp)
        renditionRef.current?.on('keyup', handleKeyUp)

        return () => {
          document.removeEventListener('keyup', handleKeyUp)
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
  }, [currentBook.filePath]) // 仅当文件路径变化时重载

  // Apply Theme changes dynamically
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.select(currentTheme)
    }
  }, [currentTheme])

  // Apply Font Size dynamically
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${fontSize}%`)
    }
  }, [fontSize])

  const handleTocClick = (href: string) => {
    renditionRef.current?.display(href)
    setIsSidebarOpen(false) // 点击后自动收起侧边栏
  }

  // 递归渲染目录
  const renderToc = (items: NavItem[], depth = 0) => {
    return items.map(item => (
      <div key={item.id}>
        <button
          className={`w-full text-left py-2 px-4 hover:bg-black/5 transition text-sm ${depth > 0 ? 'text-gray-500' : 'text-gray-800 font-medium'}`}
          style={{ paddingLeft: `${(depth + 1) * 1}rem` }}
          onClick={() => handleTocClick(item.href)}
        >
          {item.label}
        </button>
        {item.subitems && item.subitems.length > 0 && renderToc(item.subitems, depth + 1)}
      </div>
    ))
  }

  // 计算当前阅读器外壳的背景色
  const containerBg = currentTheme === 'light' ? 'bg-white' 
                    : currentTheme === 'sepia' ? 'bg-[#FDF6E3]' 
                    : 'bg-[#18181A]'

  const isDark = currentTheme === 'dark'

  return (
    <div className={`flex flex-col h-screen overflow-hidden transition-colors duration-300 ${containerBg}`}>
      {/* Top Bar */}
      <div className={`h-14 flex items-center justify-between px-4 shadow-sm z-20 shrink-0 select-none ${isDark ? 'bg-[#1E1E1E] border-b border-gray-800 text-gray-300' : 'bg-white border-b border-gray-200 text-gray-800'}`}>
        <div className="flex items-center gap-4 w-1/3">
          <button onClick={onBack} className="p-2 hover:bg-black/5 rounded-full transition" title="返回书架">
            <ArrowLeft size={20} />
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className={`p-2 hover:bg-black/5 rounded-full transition ${isSidebarOpen ? 'bg-black/5' : ''}`}
            title="目录"
          >
            <Menu size={20} />
          </button>
        </div>

        <span className="font-medium truncate text-center flex-1">{currentBook.title}</span>
        
        <div className="flex items-center justify-end w-1/3 relative">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2 hover:bg-black/5 rounded-full transition ${isSettingsOpen ? 'bg-black/5' : ''}`}
            title="阅读设置"
          >
            <Settings size={20} />
          </button>

          {/* Settings Dropdown */}
          {isSettingsOpen && (
            <div className={`absolute top-12 right-0 w-64 rounded-xl shadow-xl p-4 border z-50 ${isDark ? 'bg-[#2A2A2C] border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="mb-4">
                <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>背景主题</p>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentTheme('light')} className={`flex-1 py-2 rounded border flex justify-center items-center gap-1 ${currentTheme === 'light' ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-200'} bg-white text-black`}><Sun size={14}/>浅色</button>
                  <button onClick={() => setCurrentTheme('sepia')} className={`flex-1 py-2 rounded border flex justify-center items-center gap-1 ${currentTheme === 'sepia' ? 'ring-2 ring-blue-500 border-transparent' : 'border-[#e6debc]'} bg-[#FDF6E3] text-[#433422]`}><Coffee size={14}/>护眼</button>
                  <button onClick={() => setCurrentTheme('dark')} className={`flex-1 py-2 rounded border flex justify-center items-center gap-1 ${currentTheme === 'dark' ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-700'} bg-[#1E1E1E] text-white`}><Moon size={14}/>夜间</button>
                </div>
              </div>
              <div>
                <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>字体大小: {fontSize}%</p>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setFontSize(Math.max(50, fontSize - 10))}
                    className={`flex-1 py-1 rounded border flex justify-center items-center ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <Type size={14} />-
                  </button>
                  <button 
                    onClick={() => setFontSize(Math.min(200, fontSize + 10))}
                    className={`flex-1 py-1 rounded border flex justify-center items-center ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <Type size={18} />+
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar (TOC) */}
        <div 
          className={`absolute lg:relative z-40 h-full w-64 md:w-80 shadow-lg lg:shadow-none border-r transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:hidden lg:w-0 lg:border-0'} ${isDark ? 'bg-[#252526] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200'}`}
        >
          <div className={`p-4 border-b font-medium select-none ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>目录</div>
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400">
            {toc.length > 0 ? (
              <div className="py-2">{renderToc(toc)}</div>
            ) : (
              <div className="p-4 text-sm text-gray-500 text-center">暂无目录数据</div>
            )}
          </div>
        </div>

        {/* Backdrop for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            className="absolute inset-0 bg-black/20 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Reader Area */}
        <div className="flex-1 relative flex items-center justify-center">
          <button 
            onClick={() => renditionRef.current?.prev()}
            className={`absolute left-4 z-10 p-2 rounded-full shadow transition hover:scale-105 ${isDark ? 'bg-gray-800/80 hover:bg-gray-700 text-gray-300' : 'bg-white/80 hover:bg-white text-gray-600'}`}
          >
            <ChevronLeft size={32} />
          </button>
          
          <div className="w-full h-full max-w-4xl pt-8 pb-4 px-12 md:px-20 lg:px-24">
             <div className="w-full h-full" ref={viewerRef}></div>
          </div>

          <button 
            onClick={() => renditionRef.current?.next()}
            className={`absolute right-4 z-10 p-2 rounded-full shadow transition hover:scale-105 ${isDark ? 'bg-gray-800/80 hover:bg-gray-700 text-gray-300' : 'bg-white/80 hover:bg-white text-gray-600'}`}
          >
            <ChevronRight size={32} />
          </button>
        </div>
      </div>
    </div>
  )
}
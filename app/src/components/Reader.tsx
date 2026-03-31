import { useEffect, useRef, useState } from 'react'
import ePub, { Book as EPubBook, Rendition } from 'epubjs'
import type { Book } from '../types'
import { useBookStore } from '../store/bookStore'
import { ArrowLeft, ChevronLeft, ChevronRight, Menu, Settings, Sun, Moon, Coffee, Type, Maximize, Minimize } from 'lucide-react'

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

const FONTS = [
  { name: 'System Default', value: 'system-ui, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Monospace', value: 'Consolas, monospace' }
]

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
  const [lineHeight, setLineHeight] = useState(1.5)
  const [fontFamily, setFontFamily] = useState(FONTS[0].value)
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>('sepia')

  // Phase 5: Immersion & Progress
  const [isIdle, setIsIdle] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isLocationsReady, setIsLocationsReady] = useState(false)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-hide UI on idle
  useEffect(() => {
    const resetIdleTimer = () => {
      setIsIdle(false)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        if (!isSidebarOpen && !isSettingsOpen) {
          setIsIdle(true)
        }
      }, 3000)
    }

    document.addEventListener('mousemove', resetIdleTimer)
    document.addEventListener('keydown', resetIdleTimer)
    resetIdleTimer() // initial call
    return () => {
      document.removeEventListener('mousemove', resetIdleTimer)
      document.removeEventListener('keydown', resetIdleTimer)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [isSidebarOpen, isSettingsOpen])

  // Fullscreen tracking
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err))
    } else {
      document.exitFullscreen()
    }
  }

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

        // Generate locations for progress bar
        epubBook.locations.generate(1600).then(() => {
          if (isMounted) setIsLocationsReady(true)
        }).catch(err => console.error("Error generating locations:", err))

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
          rendition.themes.fontSize(fontSize + "%");
          rendition.themes.override('line-height', lineHeight.toString());
          rendition.themes.override('font-family', fontFamily);

          // Move to last reading pos or start
          if (currentBook.lastReadCfi) {
            await rendition.display(currentBook.lastReadCfi)
          } else {
            await rendition.display()
          }

          // Track progress
          rendition.on('relocated', (location: any) => {
            if (!isMounted) return;
            updateBookProgress(currentBook.id, location.start.cfi)

            if (epubBook.locations.length() > 0) {
              const pct = epubBook.locations.percentageFromCfi(location.start.cfi)
              setProgress(pct * 100)
            }
          })

          // Extract TOC
          epubBook.loaded.navigation.then(nav => {
            if (isMounted) {
              setToc(nav.toc as NavItem[])
            }
          })
        }

        // Key bindings for navigation & shortcuts
        const handleKeyUp = (e: KeyboardEvent | Event) => {
          const keyboardEvent = e as KeyboardEvent;
          // Ignore if typing in an input
          if (['INPUT', 'TEXTAREA'].includes((keyboardEvent.target as HTMLElement).tagName)) return;

          switch (keyboardEvent.key) {
            case 'ArrowLeft':
            case 'PageUp':
              renditionRef.current?.prev()
              break;
            case 'ArrowRight':
            case 'PageDown':
              renditionRef.current?.next()
              break;
            case ' ':
              if (keyboardEvent.shiftKey) {
                renditionRef.current?.prev()
              } else {
                renditionRef.current?.next()
              }
              break;
            case 'Escape':
              if (document.fullscreenElement) {
                document.exitFullscreen()
              } else {
                onBack()
              }
              break;
            case 'F11':
              keyboardEvent.preventDefault()
              toggleFullscreen()
              break;
          }
        }
        
        document.addEventListener('keyup', handleKeyUp)
        renditionRef.current?.on('keyup', handleKeyUp)

        // Mouse wheel bindings for navigation
        const handleWheel = (e: WheelEvent) => {
          if (e.deltaY > 0) renditionRef.current?.next()
          else if (e.deltaY < 0) renditionRef.current?.prev()
        }
        
        document.addEventListener('wheel', handleWheel)

        renditionRef.current?.hooks.content.register((contents: any) => {
          const el = contents.document.documentElement;
          if (el) {
            el.addEventListener('wheel', (e: WheelEvent) => {
              e.preventDefault();
              handleWheel(e);
            });
            // Forward keydown to outer document
            el.addEventListener('keyup', (e: KeyboardEvent) => {
               handleKeyUp(e);
            });
            // Forward mousemove to reset idle
            el.addEventListener('mousemove', () => {
               document.dispatchEvent(new Event('mousemove'));
            });
          }
        });

        return () => {
          document.removeEventListener('keyup', handleKeyUp)
          document.removeEventListener('wheel', handleWheel)
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

  // Apply visual changes dynamically
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.select(currentTheme)
      renditionRef.current.themes.fontSize(fontSize + "%")
      renditionRef.current.themes.override('line-height', lineHeight.toString())
      renditionRef.current.themes.override('font-family', fontFamily)
    }
  }, [currentTheme, fontSize, lineHeight, fontFamily])

  const handleTocClick = (href: string) => {
    renditionRef.current?.display(href)
    setIsSidebarOpen(false)
  }

  const renderToc = (items: NavItem[], depth = 0) => {
    return items.map(item => (
      <div key={item.id}>
        <button
          className={'w-full text-left py-2 px-4 hover:bg-black/5 transition text-sm ' + (depth > 0 ? 'text-gray-600' : 'font-medium')}
          style={{ paddingLeft: (depth * 1 + 1) + 'rem' }}
          onClick={() => handleTocClick(item.href)}
        >
          {item.label}
        </button>
        {item.subitems && item.subitems.length > 0 && renderToc(item.subitems, depth + 1)}
      </div>
    ))
  }

  const containerBg = currentTheme === 'light' ? 'bg-white' 
                    : currentTheme === 'sepia' ? 'bg-[#FDF6E3]' 
                    : 'bg-[#18181A]'

  const isDark = currentTheme === 'dark'

  return (
    <div className={'flex flex-col h-screen overflow-hidden transition-colors duration-300 ' + containerBg + (isDark ? ' text-white' : ' text-black')}>
      {/* Top Bar (Auto-hides in Immersive Mode) */}
      <div className={'absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 shadow-sm z-20 shrink-0 select-none transition-all duration-500 ' + (isIdle ? ' -translate-y-full opacity-0' : ' translate-y-0 opacity-100') + (isDark ? ' bg-[#1e1e1e] border-white/10' : ' bg-white border-black/5') + ' border-b'}>
        <div className="flex items-center gap-4 w-1/3">
          <button onClick={onBack} className="p-2 hover:bg-black/5 rounded-full transition" title="返回 (Esc)">
            <ArrowLeft size={20} />
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className={'p-2 hover:bg-black/5 rounded-full transition ' + (isSidebarOpen ? 'bg-black/5' : '')}
            title="目录"
          >
            <Menu size={20} />
          </button>
        </div>

        <span className="font-medium truncate text-center flex-1">{currentBook.title}</span>
        
        <div className="flex items-center justify-end w-1/3 gap-2 relative">
          <button onClick={toggleFullscreen} className="p-2 hover:bg-black/5 rounded-full transition" title="全屏 (F11)">
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>

          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={'p-2 hover:bg-black/5 rounded-full transition ' + (isSettingsOpen ? 'bg-black/5' : '')}
            title="阅读设置"
          >
            <Settings size={20} />
          </button>

          {/* Settings Dropdown */}
          {isSettingsOpen && (
            <div className={'absolute top-12 right-0 w-72 rounded-xl shadow-xl p-5 border z-50 flex flex-col gap-5 ' + (isDark ? 'bg-[#1e1e1e] border-white/10' : 'bg-white border-black/5')}>
              {/* Theme Settings */}
              <div>
                <p className={'text-xs font-semibold mb-2 ' + (isDark ? 'text-gray-400' : 'text-gray-500')}>背景主题</p>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentTheme('light')} className={'flex-1 py-1.5 rounded border flex justify-center items-center gap-1 bg-white text-black ' + (currentTheme === 'light' ? 'border-primary ring-2' : '')}>浅色</button>
                  <button onClick={() => setCurrentTheme('sepia')} className={'flex-1 py-1.5 rounded border flex justify-center items-center gap-1 bg-[#FDF6E3] text-[#433422] ' + (currentTheme === 'sepia' ? 'border-primary ring-2' : '')}>护眼</button>
                  <button onClick={() => setCurrentTheme('dark')} className={'flex-1 py-1.5 rounded border flex justify-center items-center gap-1 bg-[#1E1E1E] text-white ' + (currentTheme === 'dark' ? 'border-primary ring-2' : '')}>夜间</button>
                </div>
              </div>
              
              {/* Font Size & Line Height */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className={'text-xs font-semibold mb-2 ' + (isDark ? 'text-gray-400' : 'text-gray-500')}>字号 ({fontSize}%)</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setFontSize(Math.max(50, fontSize - 10))} className={'flex-1 py-1 rounded border ' + (isDark ? 'border-white/10 hover:bg-white/5' : 'hover:bg-black/5')}>-</button>
                    <button onClick={() => setFontSize(Math.min(200, fontSize + 10))} className={'flex-1 py-1 rounded border ' + (isDark ? 'border-white/10 hover:bg-white/5' : 'hover:bg-black/5')}>+</button>
                  </div>
                </div>
                <div className="flex-1">
                  <p className={'text-xs font-semibold mb-2 ' + (isDark ? 'text-gray-400' : 'text-gray-500')}>行距</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setLineHeight(Math.max(1, lineHeight - 0.2))} className={'flex-1 py-1 rounded border ' + (isDark ? 'border-white/10 hover:bg-white/5' : 'hover:bg-black/5')}>紧</button>
                    <button onClick={() => setLineHeight(Math.min(3, lineHeight + 0.2))} className={'flex-1 py-1 rounded border ' + (isDark ? 'border-white/10 hover:bg-white/5' : 'hover:bg-black/5')}>松</button>
                  </div>
                </div>
              </div>

              {/* Font Family */}
              <div>
                <p className={'text-xs font-semibold mb-2 ' + (isDark ? 'text-gray-400' : 'text-gray-500')}>字体</p>
                <select 
                  value={fontFamily} 
                  onChange={(e) => setFontFamily(e.target.value)}
                  className={'w-full p-2 rounded border text-sm ' + (isDark ? 'bg-[#2a2a2a] border-white/10' : 'bg-white hover:bg-black/5')}
                >
                  {FONTS.map(f => (
                    <option key={f.name} value={f.value}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative pt-14 pb-12">
        {/* Sidebar (TOC) */}
        <div 
          className={'absolute lg:relative z-40 h-full w-64 md:w-80 shadow-lg lg:shadow-none border-r transition-transform duration-300 flex flex-col ' + (isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:-translate-x-full lg:hidden') + (isDark ? ' bg-[#1e1e1e] border-white/10' : ' bg-white border-black/5')}
        >
          <div className={'p-4 border-b font-medium select-none ' + (isDark ? 'border-white/10' : 'border-black/5')}>目录</div>
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
            className={'absolute left-4 z-10 p-2 rounded-full shadow transition hover:scale-105 duration-300 ' + (isIdle ? 'opacity-0' : 'opacity-100') + (isDark ? ' bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]' : ' bg-white text-black hover:bg-gray-100')}
          >
            <ChevronLeft size={32} />
          </button>
          
          <div className="w-full h-full max-w-4xl px-8 md:px-20 lg:px-24 flex items-center justify-center">
             <div className="w-full h-full" ref={viewerRef}></div>
          </div>

          <button 
            onClick={() => renditionRef.current?.next()}
            className={'absolute right-4 z-10 p-2 rounded-full shadow transition hover:scale-105 duration-300 ' + (isIdle ? 'opacity-0' : 'opacity-100') + (isDark ? ' bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]' : ' bg-white text-black hover:bg-gray-100')}
          >
            <ChevronRight size={32} />
          </button>
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <div className={'absolute bottom-0 left-0 right-0 h-12 px-6 flex items-center z-20 transition-all duration-500 ' + (isIdle ? ' translate-y-full opacity-0' : ' translate-y-0 opacity-100') + (isDark ? ' bg-[#1e1e1e] border-white/10' : ' bg-white border-black/5') + ' border-t'}>
        <div className="w-full max-w-4xl mx-auto flex items-center gap-4">
          <span className="text-xs w-12 text-right">{progress.toFixed(1)}%</span>
          <input 
            type="range" 
            min="0" 
            max="100" 
            step="0.1" 
            value={progress}
            disabled={!isLocationsReady}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              setProgress(val)
              const cfi = bookRef.current?.locations.cfiFromPercentage(val / 100)
              if (cfi) renditionRef.current?.display(cfi)
            }}
            className={'flex-1 h-1.5 rounded-lg appearance-none cursor-pointer ' + (isDark ? 'bg-gray-700' : 'bg-gray-200')}
            title={isLocationsReady ? "拖动跳转" : "正在解析进度..."}
          />
        </div>
      </div>
    </div>
  )
}

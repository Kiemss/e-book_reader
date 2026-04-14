import { useState, useCallback } from 'react'

export type Theme = 'light' | 'sepia' | 'dark'

export interface FontOption {
  name: string
  value: string
}

export interface ReaderSettings {
  theme: Theme
  fontSize: number
  lineHeight: number
  fontFamily: string
}

const THEMES: Record<Theme, { bg: string; text: string; codeBg: string }> = {
  light: { bg: '#ffffff', text: '#333333', codeBg: '#f5f5f5' },
  sepia: { bg: '#fdf6e3', text: '#433422', codeBg: '#e8e0d0' },
  dark: { bg: '#1e1e1e', text: '#cccccc', codeBg: '#2d2d2d' },
}

const DEFAULT_FONTS: FontOption[] = [
  { name: '系统默认', value: 'system-ui, sans-serif' },
  { name: '宋体', value: 'SimSun, serif' },
  { name: '黑体', value: 'SimHei, sans-serif' },
  { name: '楷体', value: 'KaiTi, serif' },
]

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'sepia',
  fontSize: 100,
  lineHeight: 1.8,
  fontFamily: DEFAULT_FONTS[0].value,
}

export function useReaderSettings(initialSettings?: Partial<ReaderSettings>) {
  const [settings, setSettings] = useState<ReaderSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  })

  const setTheme = useCallback((theme: Theme) => {
    setSettings((prev) => ({ ...prev, theme }))
  }, [])

  const setFontSize = useCallback((fontSize: number) => {
    setSettings((prev) => ({ ...prev, fontSize: Math.max(50, Math.min(200, fontSize)) }))
  }, [])

  const setLineHeight = useCallback((lineHeight: number) => {
    setSettings((prev) => ({ ...prev, lineHeight: Math.max(1, Math.min(3, lineHeight)) }))
  }, [])

  const setFontFamily = useCallback((fontFamily: string) => {
    setSettings((prev) => ({ ...prev, fontFamily }))
  }, [])

  const getThemeColors = useCallback(() => {
    return THEMES[settings.theme]
  }, [settings.theme])

  return {
    settings,
    setTheme,
    setFontSize,
    setLineHeight,
    setFontFamily,
    getThemeColors,
    fonts: DEFAULT_FONTS,
    themes: Object.keys(THEMES) as Theme[],
  }
}
import { X } from 'lucide-react'
import type { Theme, FontOption, ReaderSettings } from '../hooks/useReaderSettings'

interface ReaderSettingsPanelProps {
  isOpen: boolean
  isDark: boolean
  settings: ReaderSettings
  fonts: FontOption[]
  onThemeChange: (theme: Theme) => void
  onFontSizeChange: (size: number) => void
  onLineHeightChange: (height: number) => void
  onFontFamilyChange: (family: string) => void
  onClose: () => void
}

export function ReaderSettingsPanel({
  isOpen,
  isDark,
  settings,
  fonts,
  onThemeChange,
  onFontSizeChange,
  onLineHeightChange,
  onFontFamilyChange,
  onClose,
}: ReaderSettingsPanelProps) {
  if (!isOpen) return null

  return (
    <div
      className={`absolute top-14 right-0 w-72 rounded-xl shadow-2xl p-5 border z-50 flex flex-col gap-5 text-sm ${
        isDark ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex justify-between items-center">
        <h3 className="font-medium">阅读设置</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-black/5 rounded-full transition"
        >
          <X size={16} />
        </button>
      </div>

      <div>
        <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>背景主题</p>
        <div className="flex gap-2">
          <button
            onClick={() => onThemeChange('light')}
            className={`flex-1 py-1.5 rounded border flex justify-center items-center gap-1 bg-white text-black ${
              settings.theme === 'light' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
            }`}
          >
            浅色
          </button>
          <button
            onClick={() => onThemeChange('sepia')}
            className={`flex-1 py-1.5 rounded border flex justify-center items-center gap-1 bg-[#FDF6E3] text-[#433422] ${
              settings.theme === 'sepia' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
            }`}
          >
            护眼
          </button>
          <button
            onClick={() => onThemeChange('dark')}
            className={`flex-1 py-1.5 rounded border flex justify-center items-center gap-1 bg-[#1E1E1E] text-white ${
              settings.theme === 'dark' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-700'
            }`}
          >
            夜间
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            字号 ({settings.fontSize}%)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onFontSizeChange(settings.fontSize - 10)}
              className={`flex-1 py-1 rounded border ${
                isDark ? 'border-gray-600 hover:bg-gray-600' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              -
            </button>
            <button
              onClick={() => onFontSizeChange(settings.fontSize + 10)}
              className={`flex-1 py-1 rounded border ${
                isDark ? 'border-gray-600 hover:bg-gray-600' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              +
            </button>
          </div>
        </div>
        <div className="flex-1">
          <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>行距</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onLineHeightChange(Math.max(1, settings.lineHeight - 0.2))}
              className={`flex-1 py-1 rounded border ${
                isDark ? 'border-gray-600 hover:bg-gray-600' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              紧
            </button>
            <button
              onClick={() => onLineHeightChange(Math.min(3, settings.lineHeight + 0.2))}
              className={`flex-1 py-1 rounded border ${
                isDark ? 'border-gray-600 hover:bg-gray-600' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              松
            </button>
          </div>
        </div>
      </div>

      <div>
        <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>字体</p>
        <select
          value={settings.fontFamily}
          onChange={(e) => onFontFamilyChange(e.target.value)}
          className={`w-full p-2 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            isDark ? 'bg-[#333] border-gray-600' : 'bg-white border-gray-200'
          }`}
        >
          {fonts.map((f) => (
            <option key={f.value} value={f.value}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
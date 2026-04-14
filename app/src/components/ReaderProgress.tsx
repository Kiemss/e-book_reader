interface ReaderProgressProps {
  progress: number
  isIdle: boolean
  isDark: boolean
  isLocationsReady?: boolean
  onProgressChange?: (progress: number) => void
}

export function ReaderProgress({
  progress,
  isIdle,
  isDark,
  isLocationsReady = true,
  onProgressChange,
}: ReaderProgressProps) {
  return (
    <div
      className={`absolute bottom-0 left-0 right-0 h-12 flex items-center z-20 transition-all duration-500 ${
        isIdle ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      } ${isDark ? 'bg-[#1e1e1e]/90 border-gray-800' : 'bg-white/90 border-gray-200 backdrop-blur'} border-t`}
    >
      <div className="w-full max-w-4xl mx-auto flex items-center gap-4 px-6 lg:px-12">
        <span className="text-xs w-12 text-right opacity-80">{progress.toFixed(1)}%</span>
        {onProgressChange ? (
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            disabled={!isLocationsReady}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              onProgressChange(val)
            }}
            className={`flex-1 h-1.5 rounded-lg appearance-none cursor-pointer ${
              isDark ? 'bg-gray-600 accent-blue-500' : 'bg-gray-300'
            }`}
            title={isLocationsReady ? '拖动跳转' : '正在解析进度...'}
          />
        ) : (
          <div
            className={`flex-1 h-1.5 rounded-lg appearance-none ${
              isDark ? 'bg-gray-600' : 'bg-gray-300'
            }`}
          >
            <div
              className="h-full bg-blue-500 rounded-lg transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
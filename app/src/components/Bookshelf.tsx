import { useBookStore } from '../store/bookStore'
import { BookFormat } from '../types'
import type { Book } from '../types'
import ePub from 'epubjs'
import { parseTxtFile } from '../utils/txtParser'
import { PlusCircle, Book as BookIcon, Trash2, FileText } from 'lucide-react'

export function Bookshelf({ onBookClick }: { onBookClick: (book: Book) => void }) {
  const { books, addBook, removeBook } = useBookStore()

  const handleImport = async () => {
    const filePath = await window.electronAPI.openFileDialog()
    if (!filePath) return

    if (books.find(b => b.filePath === filePath)) {
      alert("这本书已经在书架上了")
      return
    }

    try {
      const fileBuffer = await window.electronAPI.readFile(filePath)
      if (!fileBuffer) {
        alert("无法读取文件")
        return
      }

      const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      ) as ArrayBuffer

      const isTxt = filePath.toLowerCase().endsWith('.txt')
      let newBook: Book

      if (isTxt) {
        const uint8Array = new Uint8Array(arrayBuffer)
        const fakeFile = new File([uint8Array], filePath.split(/[\\/]/).pop() || 'book.txt', {
          type: 'text/plain'
        })
        const txtBook = await parseTxtFile(fakeFile, filePath)

        newBook = {
          id: txtBook.id,
          title: txtBook.title,
          author: txtBook.author,
          filePath: filePath,
          addedDate: Date.now(),
          format: BookFormat.TXT,
          txtProgress: { currentPage: 0, characterOffset: 0 },
          coverImage: undefined,
        }
      } else {
        const book = ePub(arrayBuffer as ArrayBuffer)
        await book.ready

        const metadata = await book.loaded.metadata
        const coverUrl = await book.coverUrl()

        let coverImage: string | undefined
        if (coverUrl) {
          if (coverUrl.startsWith('blob:')) {
            const resp = await fetch(coverUrl)
            const blob = await resp.blob()
            coverImage = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
          } else {
            coverImage = coverUrl
          }
        }

        newBook = {
          id: crypto.randomUUID(),
          title: metadata.title || '未知书名',
          author: metadata.creator || '未知作者',
          filePath: filePath,
          coverImage: coverImage,
          addedDate: Date.now(),
          format: BookFormat.EPUB,
        }
      }

      addBook(newBook)
    } catch (e) {
      console.error('导入失败:', e)
      alert("导入或解析文件失败")
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">我的书架</h1>
        <button
          onClick={handleImport}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          <PlusCircle size={20} />
          导入图书
        </button>
      </div>

      {books.length === 0 ? (
        <div className="text-center text-gray-500 mt-20">
          <BookIcon size={48} className="mx-auto text-gray-300 mb-4" />
          <p>书架空空如也，快去导入一本电子书吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.map(book => (
            <div
              key={book.id}
              className="group relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition overflow-hidden cursor-pointer"
              onClick={() => onBookClick(book)}
            >
              <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center relative">
                {book.format === BookFormat.TXT ? (
                  <div className="text-center p-4">
                    <FileText size={48} className="mx-auto text-blue-400 mb-2" />
                    <div className="text-lg font-semibold text-gray-600">TXT</div>
                  </div>
                ) : book.coverImage ? (
                  <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <div className="text-4xl font-bold text-gray-300 mb-2">
                      {book.title.charAt(0)}
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <button className="bg-white text-black px-4 py-1 rounded-full font-medium shadow-lg hover:scale-105 transition">
                    立即阅读
                  </button>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-gray-800 truncate" title={book.title}>{book.title}</h3>
                <p className="text-xs text-gray-500 truncate mt-1" title={book.author}>{book.author}</p>
                {(book.lastReadCfi || book.txtProgress?.currentPage) && (
                  <div className="text-xs text-blue-500 mt-2">
                    继续阅读
                  </div>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeBook(book.id) }}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition shadow-sm z-10"
                title="移除图书"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Bookshelf } from './components/Bookshelf'
import { Reader } from './components/Reader'
import { TextReader } from './components/TextReader'
import { MarkdownReader } from './components/MarkdownReader'
import { BookFormat } from './types'
import type { Book } from './types'

function App() {
  const [currentBook, setCurrentBook] = useState<Book | null>(null)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {currentBook ? (
        currentBook.format === BookFormat.TXT ? (
          <TextReader book={currentBook} onBack={() => setCurrentBook(null)} />
        ) : currentBook.format === BookFormat.MD ? (
          <MarkdownReader book={currentBook} onBack={() => setCurrentBook(null)} />
        ) : (
          <Reader book={currentBook} onBack={() => setCurrentBook(null)} />
        )
      ) : (
        <Bookshelf onBookClick={(book) => setCurrentBook(book)} />
      )}
    </div>
  )
}

export default App

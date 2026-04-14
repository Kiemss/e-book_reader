import { marked } from 'marked'
import hljs from 'highlight.js'

marked.setOptions({
  breaks: true,
  gfm: true,
})

export interface TocItem {
  id: string
  text: string
  level: number
  offset: number
}

export interface ParsedMD {
  content: string
  html: string
  title: string
  author: string
  toc: TocItem[]
}

export function detectEncoding(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)

  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return 'UTF-8'
  }
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return 'UTF-16LE'
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return 'UTF-16BE'
  }

  return 'UTF-8'
}

export function decodeText(buffer: ArrayBuffer, encoding: string): string {
  const decoder = new TextDecoder(encoding === 'GBK' ? 'gbk' : 'utf-8')
  return decoder.decode(buffer).replace(/^\uFEFF/, '')
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function parseMdFile(file: File): Promise<ParsedMD> {
  const buffer = await file.arrayBuffer()
  const content = decodeText(buffer, detectEncoding(buffer))

  const toc: TocItem[] = []
  let headingCount = 0

  marked.use({
    renderer: {
      heading({ text, depth }: { text: string; depth: number }) {
        const id = slugify(text) + '-' + headingCount++
        if (depth >= 1 && depth <= 3) {
          toc.push({ id, text, level: depth, offset: 0 })
        }
        return `<h${depth} id="${id}">${text}</h${depth}>\n`
      },
      code({ text, lang }: { text: string; lang?: string }) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            const highlighted = hljs.highlight(text, { language: lang }).value
            return `<pre class="hljs-pre"><code class="hljs language-${lang}">${highlighted}</code></pre>`
          } catch {
            return `<pre class="hljs-pre"><code>${escapeHtml(text)}</code></pre>`
          }
        }
        return `<pre class="hljs-pre"><code>${escapeHtml(text)}</code></pre>`
      }
    }
  })

  const html = await marked(content)

  const title = extractTitleFromMd(content) || file.name.replace(/\.md$/i, '')
  const author = extractAuthorFromMd(content)

  return { content, html, title, author, toc }
}

function extractTitleFromMd(content: string): string | null {
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('# ')) {
      return trimmed.slice(2).trim()
    }
  }
  return null
}

function extractAuthorFromMd(content: string): string {
  const lines = content.split('\n')
  for (const line of lines.slice(0, 20)) {
    const authorMatch = line.match(/author[：:]\s*(.+)/i)
    if (authorMatch) {
      return authorMatch[1].trim()
    }
  }
  return '未知作者'
}

export function calculateProgress(scrollTop: number, scrollHeight: number): number {
  if (scrollHeight === 0) return 0
  return Math.round((scrollTop / (scrollHeight - window.innerHeight)) * 100)
}

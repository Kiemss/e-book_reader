import type { TXTBook } from '../types';

const CHARS_PER_PAGE = 2000;

export function detectEncoding(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return 'UTF-8';
  }
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return 'UTF-16LE';
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return 'UTF-16BE';
  }

  let hasHighBytes = false;
  for (let i = 0; i < Math.min(bytes.length, 1000); i++) {
    if (bytes[i] > 127) {
      hasHighBytes = true;
      break;
    }
  }

  if (hasHighBytes) {
    let hasGBKPattern = true;
    for (let i = 0; i < Math.min(bytes.length, 100); i++) {
      if (bytes[i] > 127) {
        if (i + 1 < bytes.length && bytes[i + 1] > 127) {
          i++;
        } else {
          hasGBKPattern = false;
          break;
        }
      }
    }
    if (hasGBKPattern) {
      return 'GBK';
    }
  }

  return 'UTF-8';
}

export function decodeText(buffer: ArrayBuffer, encoding: string): string {
  let decoded: string;

  if (encoding === 'UTF-8') {
    const decoder = new TextDecoder('utf-8');
    decoded = decoder.decode(buffer);
  } else if (encoding === 'GBK') {
    const decoder = new TextDecoder('gbk');
    decoded = decoder.decode(buffer);
  } else if (encoding === 'UTF-16LE') {
    const decoder = new TextDecoder('utf-16le');
    decoded = decoder.decode(buffer);
  } else if (encoding === 'UTF-16BE') {
    const decoder = new TextDecoder('utf-16be');
    decoded = decoder.decode(buffer);
  } else {
    const decoder = new TextDecoder('utf-8');
    decoded = decoder.decode(buffer);
  }

  return decoded.replace(/^\uFEFF/, '');
}

export function splitIntoPages(content: string, charsPerPage: number = CHARS_PER_PAGE): string[] {
  const pages: string[] = [];
  const lines = content.split('\n');
  let currentPage = '';
  let currentLength = 0;

  for (const line of lines) {
    const lineLength = line.length + 1;

    if (currentLength + lineLength > charsPerPage && currentPage.length > 0) {
      pages.push(currentPage.trim());
      currentPage = '';
      currentLength = 0;
    }

    currentPage += line + '\n';
    currentLength += lineLength;
  }

  if (currentPage.trim().length > 0) {
    pages.push(currentPage.trim());
  }

  return pages;
}

export function extractTitleFromContent(content: string): string {
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length > 0 && firstLine.length <= 100) {
    return firstLine.replace(/[《》]/g, '');
  }
  return '未知书名';
}

export function extractAuthorFromContent(content: string): string {
  const lines = content.split('\n');
  for (const line of lines.slice(0, 20)) {
    const authorMatch = line.match(/作者[：:]\s*(.+)/);
    if (authorMatch) {
      return authorMatch[1].trim();
    }
  }
  return '未知作者';
}

export async function parseTxtFile(
  file: File,
  filePath: string
): Promise<TXTBook> {
  const buffer = await file.arrayBuffer();
  const encoding = detectEncoding(buffer);
  const content = decodeText(buffer, encoding);
  const pages = splitIntoPages(content);

  const title = extractTitleFromContent(content);
  const author = extractAuthorFromContent(content);

  return {
    id: crypto.randomUUID(),
    title,
    author,
    content,
    pageCount: pages.length,
    encoding,
    filePath,
  };
}

export function getPageContent(pages: string[], pageIndex: number): string {
  if (pageIndex < 0 || pageIndex >= pages.length) {
    return '';
  }
  return pages[pageIndex];
}

export function calculateProgress(
  currentPage: number,
  totalPages: number
): number {
  if (totalPages === 0) return 0;
  return Math.round((currentPage / totalPages) * 100);
}

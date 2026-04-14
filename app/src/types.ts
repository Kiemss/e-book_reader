export interface Bookmark {
  cfi: string;
  text: string;
  label: string;
  time: number;
}

export const BookFormat = {
  EPUB: 'epub',
  TXT: 'txt',
  MD: 'md',
} as const

export type BookFormat = typeof BookFormat[keyof typeof BookFormat]

export interface TXTProgress {
  currentPage: number;
  characterOffset: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverImage?: string;
  lastReadCfi?: string;
  addedDate: number;
  filePath: string;
  bookmarks?: Bookmark[];
  format: BookFormat;
  txtProgress?: TXTProgress;
}

export interface TXTBook {
  id: string;
  title: string;
  author: string;
  content: string;
  pageCount: number;
  encoding: string;
  filePath: string;
}

declare global {
  interface Window {
    electronAPI: {
      openFileDialog: () => Promise<string | null>;
      readFile: (path: string) => Promise<Uint8Array | null>;
    };
  }
}

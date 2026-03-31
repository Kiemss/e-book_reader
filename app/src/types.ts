export interface Book {
  id: string;
  title: string;
  author: string;
  coverImage?: string;
  lastReadCfi?: string;
  addedDate: number;
  filePath: string;
}


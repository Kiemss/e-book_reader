/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    openFileDialog: () => Promise<string | null>;
    readFile: (filePath: string) => Promise<Uint8Array | null>;
  }
}
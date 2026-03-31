import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
})

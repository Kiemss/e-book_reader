import { contextBridge, ipcRenderer } from "electron";
//#region electron/preload.ts
contextBridge.exposeInMainWorld("electronAPI", {
	openFileDialog: () => ipcRenderer.invoke("dialog:openFile"),
	readFile: (filePath) => ipcRenderer.invoke("fs:readFile", filePath)
});
//#endregion

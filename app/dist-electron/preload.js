let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("electronAPI", {
	openFileDialog: () => electron.ipcRenderer.invoke("dialog:openFile"),
	readFile: (filePath) => electron.ipcRenderer.invoke("fs:readFile", filePath)
});
//#endregion

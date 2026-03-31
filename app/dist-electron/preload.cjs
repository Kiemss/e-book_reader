import { contextBridge as e, ipcRenderer as t } from "electron";
//#region electron/preload.ts
e.exposeInMainWorld("electronAPI", {
	openFileDialog: () => t.invoke("dialog:openFile"),
	readFile: (e) => t.invoke("fs:readFile", e)
});
//#endregion

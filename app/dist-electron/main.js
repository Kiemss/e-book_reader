import { BrowserWindow, app, dialog, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "url";
//#region electron/main.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var win = null;
function createWindow() {
	win = new BrowserWindow({
		width: 1024,
		height: 768,
		webPreferences: { preload: path.join(__dirname, "preload.js") }
	});
	if (process.env.VITE_DEV_SERVER_URL) {
		win.loadURL(process.env.VITE_DEV_SERVER_URL);
		win.webContents.openDevTools();
	} else win.loadFile(path.join(__dirname, "../dist/index.html"));
}
app.whenReady().then(() => {
	createWindow();
	ipcMain.handle("dialog:openFile", async () => {
		const { canceled, filePaths } = await dialog.showOpenDialog({
			properties: ["openFile"],
			filters: [{
				name: "eBooks",
				extensions: ["epub"]
			}]
		});
		if (canceled || filePaths.length === 0) return null;
		return filePaths[0];
	});
	ipcMain.handle("fs:readFile", async (_, filePath) => {
		try {
			return await fs.promises.readFile(filePath);
		} catch (e) {
			console.error(e);
			return null;
		}
	});
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
//#endregion

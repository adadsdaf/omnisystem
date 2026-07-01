const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getAppVersion: () => ipcRenderer.invoke("app-version"),
  getApiPort: () => ipcRenderer.invoke("get-port"),
});

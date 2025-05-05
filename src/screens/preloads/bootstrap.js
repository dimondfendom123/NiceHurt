const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  updateStatus: (callback) =>
    ipcRenderer.on("update-status", (event, data) => callback(data)),
  getSettings: () => ipcRenderer.invoke("load-settings"),
});

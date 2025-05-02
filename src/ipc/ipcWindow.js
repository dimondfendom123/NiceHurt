const path = require("path");
const fs = require("fs");

function updateAppVersion(newVersion) {
  mainWindow.webContents.send("appVersionUpdate", newVersion);
}

function updateSirhurtVersion(newVersion) {
  mainWindow.webContents.send("sirhurtVersionUpdate", newVersion);
}

module.exports = function registerWindowControls(app, ipcMain, mainWindow) {
  ipcMain.on("window-minimize", () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on("window-maximize", () => {
    if (!mainWindow) return;

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on("window-close", () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle("getAppVersion", () => {
    return app.getVersion();
  });

  ipcMain.on("setAppVersion", (event, newVersion) => {
    updateAppVersion(newVersion);
  });

  ipcMain.handle("getSirhurtVersion", () => {
    const verFile = path.join(
      path.join(app.getPath("appData"), "NiceHurt"),
      "version"
    );
    let localVersion = fs.existsSync(verFile)
      ? fs.readFileSync(verFile, "utf-8").trim()
      : "unknown";
    return localVersion;
  });

  ipcMain.on("setSirhurtVersion", (event, newVersion) => {
    updateSirhurtVersion(newVersion);
  });
};

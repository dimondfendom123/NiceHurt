const { Settings } = require("../SettingsController");

module.exports = (ipcMain, mainWindow, state) => {
  ipcMain.handle("load-settings", async () => {
    return Settings.loadSettings();
  });

  ipcMain.handle("save-settings", async (event, newSettings) => {
    Settings.saveSettings(newSettings);
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(newSettings.alwaysOnTop);
      mainWindow.setContentProtection(newSettings.screenShareProtect);
    }
    state.autoInject = newSettings.autoInject;
    return true;
  });
};

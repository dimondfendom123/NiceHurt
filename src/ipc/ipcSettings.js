const { Settings } = require("../SettingsController");

module.exports = (ipcMain, mainWindow, state) => {
  ipcMain.handle("load-settings", async () => {
    return Settings.loadSettings();
  });

  ipcMain.handle("save-settings", async (event, newSettings) => {
    const currentSettings = Settings.loadSettings();
    newSettings.skipWhitelistAsk = currentSettings.skipWhitelistAsk;
    newSettings.whitelistFolder = currentSettings.whitelistFolder;

    Settings.saveSettings(newSettings);
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(newSettings.alwaysOnTop);
      mainWindow.setContentProtection(newSettings.screenShareProtect);
    }
    state.autoInject = newSettings.autoInject;
    return true;
  });
};

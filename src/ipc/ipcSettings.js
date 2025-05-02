const { Settings } = require("../SettingsController");

module.exports = (ipcMain, mainWindow, state) => {
  ipcMain.handle("load-settings", async () => {
    return Settings.loadSettings();
  });

  ipcMain.handle("save-settings", async (event, newSettings) => {
    const currentSettings = Settings.loadSettings();
    const mergedSettings = {
      ...currentSettings,
      ...newSettings,
    };
    Settings.saveSettings(mergedSettings);

    if (mainWindow) {
      mainWindow.setAlwaysOnTop(mergedSettings.alwaysOnTop);
      mainWindow.setContentProtection(mergedSettings.screenShareProtect);
    }
    state.autoInject = mergedSettings.autoInject;
    return true;
  });
};

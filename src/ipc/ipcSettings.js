const { Settings } = require("../SettingsController");
const { InjectorController } = require("../injector/InjectorController");
const Updater = require("../Auto-Updater");

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

  ipcMain.handle("force-reinstall-sirhurt", async () => {
    mainWindow.hide();
    try {
      const result = await Updater.forceReinstallSirHurt();
      mainWindow.show();
      if (result.success) {
        return {
          success: true,
          message: result.message,
          version: result.version,
        };
      } else {
        return {
          success: false,
          message: result.message,
          error: result.error?.toString(),
        };
      }
    } catch (error) {
      mainWindow.show();
      return {
        success: false,
        message: "Unexpected error during reinstallation",
        error: error.toString(),
      };
    }
  });

  ipcMain.handle("clean-roblox", async () => {
    const result = await InjectorController.cleanRobloxPlayerBeta();
    if (result === 1) {
      return { success: true, message: "Roblox cache cleaned successfully" };
    }
    return { success: false, message: "Failed to clean Roblox cache" };
  });
};
